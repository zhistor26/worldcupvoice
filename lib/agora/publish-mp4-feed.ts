import type { IAgoraRTCClient, ILocalVideoTrack } from 'agora-rtc-sdk-ng';

export type Mp4FeedPublisher = {
  stop: () => Promise<void>;
};

export type PublishMp4FeedParams = {
  appId: string;
  channel: string;
  token: string;
  feedUid: number;
  blob: Blob;
  onStatus?: (message: string) => void;
};

/**
 * Publish an MP4 blob to Agora RTC as the match-feed UID (second client).
 * @see docs/lazycat-second-dev/ARCHITECTURE.md §4.3
 */
export async function publishMp4BlobToFeed(
  params: PublishMp4FeedParams,
): Promise<Mp4FeedPublisher> {
  const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.crossOrigin = 'anonymous';

  const objectUrl = URL.createObjectURL(params.blob);
  video.src = objectUrl;

  params.onStatus?.('正在加载录像…');
  await new Promise<void>((resolve, reject) => {
    const onReady = () => resolve();
    const onError = () => reject(new Error('无法播放所选视频文件'));
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.load();
    void video.play().catch(reject);
  });

  params.onStatus?.('正在推流到直播间…');
  const client: IAgoraRTCClient = AgoraRTC.createClient({
    mode: 'live',
    codec: 'h264',
  });
  await client.setClientRole('host');
  await client.join(
    params.appId,
    params.channel,
    params.token,
    params.feedUid,
  );

  const videoWithCapture = video as HTMLVideoElement & {
    captureStream?: (fps?: number) => MediaStream;
  };
  const stream =
    typeof videoWithCapture.captureStream === 'function'
      ? videoWithCapture.captureStream(30)
      : null;
  if (!stream) {
    await client.leave();
    URL.revokeObjectURL(objectUrl);
    throw new Error('当前浏览器不支持从视频推流');
  }
  const [mediaTrack] = stream.getVideoTracks();
  if (!mediaTrack) {
    await client.leave();
    URL.revokeObjectURL(objectUrl);
    throw new Error('无法从视频文件创建画面轨');
  }

  const customTrack: ILocalVideoTrack = AgoraRTC.createCustomVideoTrack({
    mediaStreamTrack: mediaTrack,
  });
  await client.publish([customTrack]);
  params.onStatus?.('录像已推流，可开启 AI 解说');

  return {
    stop: async () => {
      customTrack.stop();
      customTrack.close();
      await client.unpublish().catch(() => undefined);
      await client.leave();
      URL.revokeObjectURL(objectUrl);
      video.remove();
    },
  };
}

/**
 * Load a LazyCat Drive path into a File via HTTP fetch.
 */
export async function fetchLazyCatVideoFile(
  lazyCatPath: string,
  fileName: string,
): Promise<File> {
  const { buildLazyCatFileUrl, isVideoPath } = await import(
    '@/lib/lazycat/netdisk-path'
  );
  if (!isVideoPath(lazyCatPath)) {
    throw new Error('请选择 MP4 / WebM / MOV 格式的比赛录像');
  }
  const url = buildLazyCatFileUrl(lazyCatPath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法读取网盘文件（HTTP ${response.status}）`);
  }
  const blob = await response.blob();
  const name = fileName || lazyCatPath.split('/').pop() || 'match.mp4';
  return new File([blob], name, {
    type: blob.type || 'video/mp4',
  });
}
