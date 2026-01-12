using System.Collections.Generic;
using Newtonsoft.Json;
using NUnit.Framework;
using SolidLink.Addin.Bridge;

namespace SolidLink.Tests.Unit
{
    [TestFixture]
    [Category("Unit")]
    public class MessageBridgeTests
    {
        [Test]
        public void Send_SerializesAndPosts()
        {
            // Arrange
            var webView = new TestWebViewBridge();
            var bridge = new MessageBridge();
            bridge.Initialize(webView);

            // Act
            bridge.Send("TEST", new { data = 123 });

            // Assert
            Assert.That(webView.SentMessages.Count, Is.EqualTo(1));
            Assert.That(webView.SentMessages[0], Does.Contain("\"TEST\""));
        }

        [Test]
        public void OnPing_SendsPong()
        {
            // Arrange
            var webView = new TestWebViewBridge();
            var bridge = new MessageBridge();
            bridge.Initialize(webView);
            var pingJson = JsonConvert.SerializeObject(new BridgeMessage("PING"));

            // Act
            webView.Emit(pingJson);

            // Assert
            Assert.That(webView.SentMessages.Count, Is.EqualTo(1));
            Assert.That(webView.SentMessages[0], Does.Contain("\"PONG\""));
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
