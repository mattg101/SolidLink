using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SolidLink.Addin.Bridge
{
    public sealed class BridgeRecorder : IDisposable
    {
        private static readonly HashSet<string> SensitiveKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "token",
            "accessToken",
            "refreshToken",
            "password",
            "secret",
            "apiKey",
            "credentials"
        };

        private readonly MessageBridge bridge;
        private BridgeRecording recording;
        private string outputPath;
        private bool isRecording;

        public BridgeRecorder(MessageBridge bridgeInstance)
        {
            if (bridgeInstance == null)
                throw new ArgumentNullException("bridgeInstance");
            bridge = bridgeInstance;
        }

        public void Start(string path)
        {
            if (isRecording)
                throw new InvalidOperationException("Recorder already started.");

            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Recording path is required.", "path");

            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            outputPath = path;
            recording = new BridgeRecording();
            bridge.MessageSent += OnMessageSent;
            bridge.MessageReceivedRaw += OnMessageReceived;
            isRecording = true;
        }

        public void Stop()
        {
            if (!isRecording)
                return;

            bridge.MessageSent -= OnMessageSent;
            bridge.MessageReceivedRaw -= OnMessageReceived;
            isRecording = false;

            if (recording == null || string.IsNullOrWhiteSpace(outputPath))
                return;

            var json = JsonConvert.SerializeObject(recording, Formatting.Indented);
            File.WriteAllText(outputPath, json);
        }

        public void Dispose()
        {
            Stop();
        }

        private void OnMessageSent(object sender, BridgeMessageEventArgs args)
        {
            AddEntry("outbound", args.Message);
        }

        private void OnMessageReceived(object sender, BridgeMessageEventArgs args)
        {
            AddEntry("inbound", args.Message);
        }

        private void AddEntry(string direction, BridgeMessage message)
        {
            var payload = message.Payload == null
                ? null
                : SanitizeToken(message.Payload as JToken ?? JToken.FromObject(message.Payload));

            recording.Messages.Add(new BridgeRecordingEntry
            {
                TimestampUtc = DateTimeOffset.UtcNow,
                Direction = direction,
                Type = message.Type,
                CorrelationId = message.CorrelationId,
                Payload = payload
            });
        }

        private static JToken SanitizeToken(JToken token)
        {
            if (token == null)
                return null;

            switch (token.Type)
            {
                case JTokenType.Object:
                    var obj = (JObject)token.DeepClone();
                    foreach (var prop in obj.Properties().ToList())
                    {
                        if (SensitiveKeys.Contains(prop.Name))
                        {
                            prop.Value = "[REDACTED]";
                        }
                        else
                        {
                            prop.Value = SanitizeToken(prop.Value);
                        }
                    }
                    return obj;
                case JTokenType.Array:
                    var array = (JArray)token.DeepClone();
                    for (int i = 0; i < array.Count; i++)
                    {
                        array[i] = SanitizeToken(array[i]);
                    }
                    return array;
                default:
                    return token.DeepClone();
            }
        }
    }
}
