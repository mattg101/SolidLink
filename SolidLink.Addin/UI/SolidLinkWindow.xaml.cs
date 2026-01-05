using System;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using SolidWorks.Interop.sldworks;
using SolidLink.Addin.Bridge;
using SolidLink.Addin.Services;

namespace SolidLink.Addin.UI
{
    public partial class SolidLinkWindow : Window
    {
        private readonly SldWorks swApp;
        private readonly MessageBridge bridge;
        private readonly TreeTraverser traverser;

        public SolidLinkWindow(SldWorks app)
        {
            InitializeComponent();
            swApp = app ?? throw new ArgumentNullException(nameof(app));
            bridge = new MessageBridge();
            traverser = new TreeTraverser(swApp);
            InitializeWebView();
        }

        private async void InitializeWebView()
        {
            try
            {
                string userDataFolder = System.IO.Path.Combine(
                    System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData), 
                    "SolidLink");
                System.IO.Directory.CreateDirectory(userDataFolder);

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await webView.EnsureCoreWebView2Async(env);

                // Initialize the message bridge
                bridge.Initialize(webView.CoreWebView2);
                bridge.MessageReceived += OnBridgeMessageReceived;

                // For development, point to localhost. For production, this will point to embedded assets.
                // TODO: Make this configurable
                webView.CoreWebView2.NavigationCompleted += (s, args) =>
                {
                    if (args.IsSuccess)
                    {
                        bridge.SendConnectionStatus();
                    }
                };
                webView.Source = new Uri("http://localhost:5173");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to initialize WebView2: " + ex.Message);
            }
        }

        private void OnBridgeMessageReceived(object sender, BridgeMessage message)
        {
            // Handle custom messages from the frontend
            System.Diagnostics.Debug.WriteLine($"[SolidLink] Received message: {message.Type}");
            
            if (message.Type == "REQUEST_TREE")
            {
                var model = swApp.ActiveDoc as ModelDoc2;
                if (model != null)
                {
                    var tree = traverser.ExtractModel(model);
                    bridge.Send("TREE_RESPONSE", tree);
                }
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            bridge?.Dispose();
            base.OnClosed(e);
        }
    }
}
