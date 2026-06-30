import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { DEFAULT_MATCH_FEED_UID } from '@/lib/agora';
import {
  ACCESS_COOKIE_NAME,
  isAccessGateEnabled,
  isValidAccessCookie,
} from '@/lib/accessPassword';

const EXPIRATION_TIME_IN_SECONDS = 3600;
const DEFAULT_LIVE_CHANNEL_NAME = 'worldcup-live';

function getDefaultChannelName(): string {
  return (
    process.env.NEXT_PUBLIC_LIVE_CHANNEL_NAME ??
    process.env.LIVE_CHANNEL_NAME ??
    DEFAULT_LIVE_CHANNEL_NAME
  ).trim();
}

function getFeedUid(): number {
  return Number(
    process.env.NEXT_PUBLIC_MATCH_FEED_UID ?? DEFAULT_MATCH_FEED_UID,
  );
}

export async function GET(request: NextRequest) {
  if (isAccessGateEnabled()) {
    const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
    if (!isValidAccessCookie(accessCookie)) {
      return NextResponse.json(
        { error: 'Access verification is required before publishing video.' },
        { status: 401 },
      );
    }
  }

  const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const APP_CERTIFICATE = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!APP_ID || !APP_CERTIFICATE) {
    return NextResponse.json(
      { error: 'Agora credentials are not set' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const defaultChannelName = getDefaultChannelName();
  const channelName = searchParams.get('channel') || defaultChannelName;
  if (channelName !== defaultChannelName) {
    return NextResponse.json(
      { error: 'Requested channel is not configured for this live booth.' },
      { status: 400 },
    );
  }

  const feedUid = getFeedUid();
  const expirationTime =
    Math.floor(Date.now() / 1000) + EXPIRATION_TIME_IN_SECONDS;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      feedUid,
      RtcRole.PUBLISHER,
      expirationTime,
      expirationTime,
    );

    return NextResponse.json({
      token,
      uid: feedUid.toString(),
      channel: channelName,
      appId: APP_ID,
    });
  } catch (error) {
    console.error('Error generating feed publisher token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate feed publisher token',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
