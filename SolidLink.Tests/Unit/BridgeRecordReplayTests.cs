using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using SolidLink.Addin.Bridge;

namespace SolidLink.Tests.Unit
{
    [TestFixture]
    [Category("Unit")]
    public class BridgeRecordReplayTests
    {
        [Test]
        public void Recorder_WritesOrderedMessagesWithTimestampsAndSanitizes()
        {
            var webView = new TestWebViewBridge();
            var bridge = new MessageBridge();
            bridge.Initialize(webView);

            var path = Path.Combine(TestContext.CurrentContext.WorkDirectory, "bridge_recording_test.json");
            var recorder = new BridgeRecorder(bridge);
            recorder.Start(path);

            bridge.Send("OUTBOUND", new { token = "secret", payload = new { value = 1 } });

            var inbound = JsonConvert.SerializeObject(new BridgeMessage("INBOUND", new { password = "hidden" }, "corr-in"));
            webView.Emit(inbound);

            recorder.Stop();

            var recording = JsonConvert.DeserializeObject<BridgeRecording>(File.ReadAllText(path));

            Assert.That(recording.Messages.Count, Is.EqualTo(2));
            Assert.That(recording.Messages[0].Direction, Is.EqualTo("outbound"));
            Assert.That(recording.Messages[1].Direction, Is.EqualTo("inbound"));
            Assert.That(recording.Messages[0].TimestampUtc, Is.Not.EqualTo(default(System.DateTimeOffset)));
            Assert.That(recording.Messages[1].TimestampUtc, Is.Not.EqualTo(default(System.DateTimeOffset)));
            Assert.That(recording.Messages[0].Payload["token"]?.ToString(), Is.EqualTo("[REDACTED]"));
            Assert.That(recording.Messages[1].Payload["password"]?.ToString(), Is.EqualTo("[REDACTED]"));
        }

        [Test]
        public void Replayer_EmitsMessagesInOrder()
        {
            var recording = new BridgeRecording
            {
                Messages = new List<BridgeRecordingEntry>
                {
                    new BridgeRecordingEntry
                    {
                        TimestampUtc = System.DateTimeOffset.UtcNow,
                        Direction = "outbound",
                        Type = "OUT_ONE",
                        CorrelationId = "c1",
                        Payload = JToken.FromObject(new { value = 1 })
                    },
                    new BridgeRecordingEntry
                    {
                        TimestampUtc = System.DateTimeOffset.UtcNow,
                        Direction = "inbound",
                        Type = "IN_ONE",
                        CorrelationId = "c2",
                        Payload = JToken.FromObject(new { value = 2 })
                    },
                    new BridgeRecordingEntry
                    {
                        TimestampUtc = System.DateTimeOffset.UtcNow,
                        Direction = "outbound",
                        Type = "OUT_TWO",
                        CorrelationId = "c3",
                        Payload = JToken.FromObject(new { value = 3 })
                    }
                }
            };

            var path = Path.Combine(TestContext.CurrentContext.WorkDirectory, "bridge_replay_test.json");
            File.WriteAllText(path, JsonConvert.SerializeObject(recording, Formatting.Indented));

            var webView = new TestWebViewBridge();
            var bridge = new MessageBridge();
            bridge.Initialize(webView);

            var received = new List<BridgeMessage>();
            bridge.MessageReceived += (_, message) => received.Add(message);

            var replayer = new BridgeReplayer(bridge);
            replayer.Play(path);

            Assert.That(webView.SentMessages.Count, Is.EqualTo(2));
            Assert.That(webView.SentMessages[0], Does.Contain("\"OUT_ONE\""));
            Assert.That(webView.SentMessages[1], Does.Contain("\"OUT_TWO\""));
            Assert.That(received.Count, Is.EqualTo(1));
            Assert.That(received[0].Type, Is.EqualTo("IN_ONE"));
        }

        private class TestWebViewBridge : IWebViewBridge
        {
            public event System.EventHandler<string> WebMessageReceivedJson;
            public List<string> SentMessages { get; } = new List<string>();

            public void PostWebMessageAsJson(string json)
            {
                SentMessages.Add(json);
            }

            public void Emit(string json)
            {
                WebMessageReceivedJson?.Invoke(this, json);
            }

            public void Dispose()
            {
            }
        }
    }
}
