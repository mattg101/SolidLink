using System;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SolidLink.Addin.Bridge
{
    public sealed class BridgeReplayer
    {
        private readonly MessageBridge bridge;

        public BridgeReplayer(MessageBridge bridgeInstance)
        {
            if (bridgeInstance == null)
                throw new ArgumentNullException("bridgeInstance");
            bridge = bridgeInstance;
        }

        public void Play(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Replay path is required.", "path");

            if (!File.Exists(path))
                throw new FileNotFoundException("Replay file not found.", path);

            var json = File.ReadAllText(path);
            var recording = JsonConvert.DeserializeObject<BridgeRecording>(json);
            if (recording == null)
                throw new InvalidOperationException("Replay file malformed.");

            foreach (var entry in recording.Messages)
            {
                var payload = entry.Payload is JValue || entry.Payload is JObject || entry.Payload is JArray
                    ? entry.Payload
                    : entry.Payload == null ? null : JToken.FromObject(entry.Payload);

                var message = new BridgeMessage(entry.Type, payload, entry.CorrelationId);

                if (string.Equals(entry.Direction, "outbound", StringComparison.OrdinalIgnoreCase))
                {
                    bridge.Send(message);
                }
                else if (string.Equals(entry.Direction, "inbound", StringComparison.OrdinalIgnoreCase))
                {
                    bridge.ReceiveJson(JsonConvert.SerializeObject(message));
                }
                else
                {
                    throw new InvalidOperationException(string.Format("Unknown direction '{0}'.", entry.Direction));
                }
            }
        }
    }
}
