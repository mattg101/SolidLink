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
                try
                {
                    var model = swApp.ActiveDoc as ModelDoc2;
                    if (model != null)
                    {
                        System.Diagnostics.Debug.WriteLine("[SolidLink] Extraction started...");
                        var tree = traverser.ExtractModel(model);
                        System.Diagnostics.Debug.WriteLine($"[SolidLink] Extraction complete: {tree.Name}");
                        bridge.Send("TREE_RESPONSE", tree);
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine("[SolidLink] No active document found.");
                        bridge.Send("ERROR_RESPONSE", "No active document in SolidWorks.");
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[SolidLink] EXTRACTION CRASH: {ex.Message}\n{ex.StackTrace}");
                    bridge.Send("ERROR_RESPONSE", $"Extraction failed: {ex.Message}");
                }
            }
            else if (message.Type == "SELECT_FRAME")
            {
                SelectFrame(message.Payload);
            }
        }

        private void SelectFrame(dynamic payload)
        {
            try
            {
                string path = payload.referencePath;
                string type = payload.type;

                string swType = "";
                switch (type)
                {
                    case "COMPONENT": swType = "COMPONENT"; break;
                    case "COORDSYS": swType = "COORD_SYS"; break;
                    case "REFAXIS": swType = "AXIS"; break;
                    case "REFPLANE": swType = "PLANE"; break;
                    default: return;
                }

                var model = swApp.ActiveDoc as ModelDoc2;
                if (model != null)
                {
                    model.Extension.SelectByID2(path, swType, 0, 0, 0, false, 0, null, 0);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[SolidLink] Selection error: {ex.Message}");
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            bridge?.Dispose();
            base.OnClosed(e);
        }
    }
}
