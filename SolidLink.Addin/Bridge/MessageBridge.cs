using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;

namespace SolidLink.Addin.Bridge
{
    /// <summary>
    /// Manages bi-directional JSON messaging between C# backend and JavaScript frontend via WebView2.
    /// </summary>
    public class MessageBridge
    {
        private IWebViewBridge webView;
        private readonly ConcurrentDictionary<string, TaskCompletionSource<BridgeMessage>> pendingRequests;

        /// <summary>
        /// Event raised when a message is received from the frontend.
        /// </summary>
        public event EventHandler<BridgeMessage> MessageReceived;

        public MessageBridge()
        {
            pendingRequests = new ConcurrentDictionary<string, TaskCompletionSource<BridgeMessage>>();
        }

        /// <summary>
        /// Initialize the bridge with a WebView2 instance.
        /// </summary>
        public void Initialize(CoreWebView2 coreWebView)
        {
            Initialize(new CoreWebView2BridgeAdapter(coreWebView));
        }

        /// <summary>
        /// Initialize the bridge with a testable WebView bridge implementation.
        /// </summary>
        public void Initialize(IWebViewBridge webViewBridge)
        {
            if (webView != null)
            {
                webView.WebMessageReceivedJson -= OnWebMessageReceived;
                webView.Dispose();
            }

            webView = webViewBridge ?? throw new ArgumentNullException(nameof(webViewBridge));
            webView.WebMessageReceivedJson += OnWebMessageReceived;
        }

        /// <summary>
        /// Send a one-way message to the frontend.
        /// </summary>
        public void Send(string type, object payload = null)
        {
            if (webView == null)
                throw new InvalidOperationException("MessageBridge not initialized. Call Initialize() first.");

            var message = new BridgeMessage(type, payload);
            string json = JsonConvert.SerializeObject(message);
            webView.PostWebMessageAsJson(json);
        }

        /// <summary>
        /// Send a CONNECTION_STATUS message to notify the frontend that the bridge is ready.
        /// </summary>
        public void SendConnectionStatus()
        {
            Send("CONNECTION_STATUS", new { status = "connected" });
        }

        /// <summary>
        /// Send a request and await a response from the frontend.
        /// </summary>
        public async Task<BridgeMessage> SendRequestAsync(string type, object payload = null, int timeoutMs = 5000)
        {
            if (webView == null)
                throw new InvalidOperationException("MessageBridge not initialized. Call Initialize() first.");

            var message = new BridgeMessage(type, payload);
            var tcs = new TaskCompletionSource<BridgeMessage>();

            if (!pendingRequests.TryAdd(message.CorrelationId, tcs))
                throw new InvalidOperationException("Failed to register pending request.");

            try
            {
                string json = JsonConvert.SerializeObject(message);
                webView.PostWebMessageAsJson(json);

                var timeoutTask = Task.Delay(timeoutMs);
                var completedTask = await Task.WhenAny(tcs.Task, timeoutTask);

                if (completedTask == timeoutTask)
                {
                    throw new TimeoutException($"Request '{type}' timed out after {timeoutMs}ms.");
                }

                return await tcs.Task;
            }
            finally
            {
                pendingRequests.TryRemove(message.CorrelationId, out _);
            }
        }

        private void OnWebMessageReceived(object sender, string json)
        {
            try
            {
                var message = JsonConvert.DeserializeObject<BridgeMessage>(json);

                if (message == null) return;

                // Check if this is a response to a pending request
                if (!string.IsNullOrEmpty(message.CorrelationId) &&
                    pendingRequests.TryGetValue(message.CorrelationId, out var tcs))
                {
                    tcs.TrySetResult(message);
                    return;
                }

                // Handle known message types
                switch (message.Type)
                {
                    case "PING":
                        Send("PONG", null);
                        break;
                    case "UI_READY":
                        SendConnectionStatus();
                        break;
                    default:
                        // Raise event for custom handling
                        MessageReceived?.Invoke(this, message);
                        break;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[MessageBridge] Error processing message: {ex.Message}");
            }
        }

        /// <summary>
        /// Cleanup resources.
        /// </summary>
        public void Dispose()
        {
            if (webView != null)
            {
                webView.WebMessageReceivedJson -= OnWebMessageReceived;
                webView.Dispose();
                webView = null;
            }
            pendingRequests.Clear();
        }
    }
}
