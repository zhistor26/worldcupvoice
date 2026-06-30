'use client';

import { useCallback, useId, useRef, useState, type MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { isVideoPath } from '@/lib/lazycat/netdisk-path';
import { publishMp4BlobToFeed, type Mp4FeedPublisher } from '@/lib/agora/publish-mp4-feed';

type NetdiskVideoPickerProps = {
  channel: string;
  disabled?: boolean;
  onPublished?: () => void;
  onError?: (message: string) => void;
  publisherRef?: MutableRefObject<Mp4FeedPublisher | null>;
};

export function NetdiskVideoPicker({
  channel,
  disabled = false,
  onPublished,
  onError,
  publisherRef,
}: NetdiskVideoPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const publishFile = useCallback(
    async (file: File) => {
      if (!isVideoPath(file.name)) {
        throw new Error('请选择 MP4 / WebM / MOV 格式的比赛录像');
      }
      setIsPublishing(true);
      setStatus('正在获取推流凭证…');
      try {
        const tokenRes = await fetch(
          `/api/generate-feed-token?channel=${encodeURIComponent(channel)}`,
        );
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
          throw new Error(tokenData.error ?? '无法获取推流凭证');
        }

        if (publisherRef?.current) {
          await publisherRef.current.stop();
          publisherRef.current = null;
        }

        const publisher = await publishMp4BlobToFeed({
          appId: tokenData.appId,
          channel: tokenData.channel,
          token: tokenData.token,
          feedUid: Number.parseInt(tokenData.uid, 10),
          blob: file,
          onStatus: setStatus,
        });

        if (publisherRef) {
          publisherRef.current = publisher;
        }
        setSelectedName(file.name);
        setStatus('录像已推流，可点击 Start AI 开启解说');
        onPublished?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '推流失败，请重试';
        setStatus(message);
        onError?.(message);
        throw error;
      } finally {
        setIsPublishing(false);
      }
    },
    [channel, onError, onPublished, publisherRef],
  );

  const handleInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        await publishFile(file);
      } catch {
        // status / onError already set
      }
    },
    [publishFile],
  );

  return (
    <div className="rounded-md border border-dashed border-white/20 bg-black/30 p-3 text-left">
      <p className="text-sm font-medium text-white">比赛录像</p>
      <p className="mt-1 text-xs leading-5 text-white/55">
        从懒猫网盘或本机选择 MP4，系统将推流到频道供 AI 解说（UID 234567）。
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="sr-only"
        disabled={disabled || isPublishing}
        onChange={handleInputChange}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 border-white/20 bg-white/5 text-white hover:bg-white/10"
          disabled={disabled || isPublishing}
          onClick={() => inputRef.current?.click()}
        >
          {isPublishing ? '推流中…' : '从网盘选择录像'}
        </Button>
        {selectedName ? (
          <span className="truncate text-xs text-emerald-200/90">{selectedName}</span>
        ) : null}
      </div>
      {status ? (
        <p className="mt-2 text-xs text-white/70" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
