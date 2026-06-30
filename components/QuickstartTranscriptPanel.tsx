'use client';

import { useEffect, useMemo, useRef } from 'react';

type TranscriptMessage = {
  turn_id?: string | number;
  uid: number;
  text?: string;
  createdAt?: number;
};

type QuickstartTranscriptPanelProps = {
  messageList: TranscriptMessage[];
  currentInProgressMessage: TranscriptMessage | null;
  agentUID: string;
};

function formatMessageTime(createdAt?: number) {
  if (!createdAt) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

export function QuickstartTranscriptPanel({
  messageList,
  currentInProgressMessage,
  agentUID,
}: QuickstartTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(
    () =>
      currentInProgressMessage
        ? [...messageList, currentInProgressMessage]
        : messageList,
    [currentInProgressMessage, messageList],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <section
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/20"
      aria-label="解说字幕面板"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">解说字幕</h2>
          <p className="text-xs text-muted-foreground">简体中文 · 实时输出</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            解说字幕将在这里实时显示
          </div>
        ) : (
          messages.map((message, index) => {
            const isAgent = String(message.uid) === agentUID;
            const label = isAgent ? 'AI 解说' : '观众';
            const text = message.text?.trim();
            const time = formatMessageTime(message.createdAt);
            const isStreaming =
              Boolean(currentInProgressMessage) &&
              message.turn_id === currentInProgressMessage?.turn_id;

            return (
              <article
                key={`${message.turn_id ?? message.uid}-${index}`}
                className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
              >
                <div className="mb-1 flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
                  <span>{label}</span>
                  {time && <span className="font-normal">{time}</span>}
                </div>
                <div
                  className={`max-w-full whitespace-pre-wrap rounded-xl border px-3 py-2 text-sm leading-6 ${
                    isAgent
                      ? 'border-white/10 bg-white/[0.06] text-white/90'
                      : 'border-primary/30 bg-primary/15 text-white'
                  }`}
                >
                  {text || '...'}
                  {isAgent && isStreaming ? (
                    <span className="ml-0.5 inline-block animate-pulse text-emerald-300">
                      ▍
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
