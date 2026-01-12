using System;

namespace SolidLink.Addin.Bridge
{
    /// <summary>
    /// Minimal abstraction over a WebView bridge for testing.
    /// </summary>
    public interface IWebViewBridge : IDisposable
    {
        /// <summary>
        /// Raised when a JSON message is received from the frontend.
        /// </summary>
        event EventHandler<string> WebMessageReceivedJson;

        /// <summary>
        /// Posts a JSON message to the frontend.
        /// </summary>
        void PostWebMessageAsJson(string json);
    }
}
