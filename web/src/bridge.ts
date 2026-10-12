export function connectBridge(callbacks: {
  pause: () => void;
  resume: () => void;
}) {
  let channel: string | undefined;
  const receive = (event: MessageEvent) => {
    if (
      event.source !== parent ||
      !event.data ||
      event.data.protocol !== "pepe-game/1"
    )
      return;
    const message = event.data;
    if (
      message.type === "init" &&
      typeof message.channel === "string" &&
      message.channel.length > 0 &&
      message.channel.length <= 200
    ) {
      channel = message.channel;
      parent.postMessage(
        { protocol: "pepe-game/1", type: "ready", channel },
        "*",
      );
    }
    if (!channel || message.channel !== channel) return;
    if (message.type === "pause") callbacks.pause();
    if (message.type === "resume") callbacks.resume();
  };
  window.addEventListener("message", receive);
  return {
    score(score: number) {
      if (channel && Number.isSafeInteger(score) && score >= 0)
        parent.postMessage(
          { protocol: "pepe-game/1", type: "score", channel, score },
          "*",
        );
    },
  };
}
