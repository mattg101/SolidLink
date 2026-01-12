using System;
using System.Collections.Generic;

namespace SolidLink.Addin.Bridge
{
    /// <summary>
    /// Simple in-memory web view bridge for tooling and scripts.
    /// </summary>
    public sealed class InMemoryWebViewBridge : IWebViewBridge
    {
        public event EventHandler<string> WebMessageReceivedJson;

        public List<string> SentMessages { get; private set; }

        public InMemoryWebViewBridge()
        {
            SentMessages = new List<string>();
        }

        public void PostWebMessageAsJson(string json)
        {
            SentMessages.Add(json);
        }

        public void Emit(string json)
        {
            if (WebMessageReceivedJson != null)
                WebMessageReceivedJson(this, json);
        }

        public void Dispose()
        {
        }
    }
}
