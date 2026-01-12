using System;
using Microsoft.Web.WebView2.Core;

namespace SolidLink.Addin.Bridge
{
    /// <summary>
    /// Adapter that exposes CoreWebView2 through IWebViewBridge.
    /// </summary>
    public sealed class CoreWebView2BridgeAdapter : IWebViewBridge
    {
        private CoreWebView2 _coreWebView;

        public event EventHandler<string> WebMessageReceivedJson;

        public CoreWebView2BridgeAdapter(CoreWebView2 coreWebView)
        {
            if (coreWebView == null)
                throw new ArgumentNullException("coreWebView");
            _coreWebView = coreWebView;
            _coreWebView.WebMessageReceived += OnWebMessageReceived;
        }

        public void PostWebMessageAsJson(string json)
        {
            _coreWebView.PostWebMessageAsJson(json);
        }

        public void Dispose()
        {
            if (_coreWebView != null)
            {
                _coreWebView.WebMessageReceived -= OnWebMessageReceived;
                _coreWebView = null;
            }
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            if (WebMessageReceivedJson != null)
                WebMessageReceivedJson(this, e.WebMessageAsJson);
        }
    }
}
