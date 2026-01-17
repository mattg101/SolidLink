using System;
using System.Collections.Generic;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;
using SolidWorks.Interop.sldworks;
using SolidLink.Addin.Adapters;
using SolidLink.Addin.Abstractions;
using SolidLink.Addin.Bridge;
using SolidLink.Addin.Services;

namespace SolidLink.Addin.UI
{
    public partial class SolidLinkWindow : Window
    {
        private readonly SldWorks swApp;
        private readonly MessageBridge bridge;
        private readonly TreeTraverser traverser;
        private readonly ISolidWorksContext context;
        private readonly HiddenStateService hiddenStateService;

        public SolidLinkWindow(SldWorks app)
        {
            InitializeComponent();
            swApp = app ?? throw new ArgumentNullException(nameof(app));
            bridge = new MessageBridge();
            context = new SolidWorksContext(swApp);
            traverser = new TreeTraverser(context);
            hiddenStateService = new HiddenStateService();
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
                    var model = context.ActiveModel;
                    if (model != null)
                    {
                        System.Diagnostics.Debug.WriteLine("[SolidLink] Extraction started...");
                        var tree = traverser.ExtractModel(model);
                        var refGeometry = traverser.ExtractReferenceGeometry(model);
                        System.Diagnostics.Debug.WriteLine($"[SolidLink] Extraction complete: {tree.Name}");
                        bridge.Send("TREE_RESPONSE", tree);
                        bridge.Send("REF_GEOMETRY_LIST", refGeometry);
                        SendHiddenStateRestore();
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
            else if (message.Type == "HIDE_REQUEST")
            {
                ApplyHiddenDelta(message.Payload, true);
            }
            else if (message.Type == "UNHIDE_REQUEST")
            {
                ApplyHiddenDelta(message.Payload, false);
            }
            else if (message.Type == "HIDDEN_STATE_UPDATE")
            {
                SetHiddenState(message.Payload);
            }
            else if (message.Type == "REF_GEOMETRY_HIDE")
            {
                ApplyRefGeometryHiddenState(message.Payload);
            }
            else if (message.Type == "REF_ORIGIN_TOGGLE" || message.Type == "REF_ORIGIN_GLOBAL_TOGGLE")
            {
                // UI-only for now; keep hook for future SolidWorks viewport integration.
                System.Diagnostics.Debug.WriteLine($"[SolidLink] Ref origin toggle received: {message.Type}");
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

        private ModelDoc2 GetActiveModel()
        {
            return swApp.ActiveDoc as ModelDoc2;
        }

        private void SendHiddenStateRestore()
        {
            var model = GetActiveModel();
            var hiddenIds = hiddenStateService.LoadHiddenIds(model);
            bridge.Send("HIDDEN_STATE_RESTORE", new { hiddenIds });
        }

        private void ApplyHiddenDelta(object payload, bool hide)
        {
            var data = ParsePayload<HiddenStateRequest>(payload);
            if (data?.Ids == null || data.Ids.Count == 0)
            {
                return;
            }

            ApplyHiddenIds(data.Ids, hide);
        }

        private void ApplyHiddenIds(IEnumerable<string> ids, bool hide)
        {
            if (ids == null)
            {
                return;
            }

            var model = GetActiveModel();
            if (model == null)
            {
                return;
            }

            var current = hiddenStateService.LoadHiddenIds(model);
            var set = new HashSet<string>(current);
            foreach (var id in ids)
            {
                if (string.IsNullOrWhiteSpace(id)) continue;
                if (hide)
                {
                    set.Add(id);
                }
                else
                {
                    set.Remove(id);
                }
            }
            hiddenStateService.SaveHiddenIds(model, set);
        }

        private void ApplyRefGeometryHiddenState(object payload)
        {
            var data = ParsePayload<RefGeometryHideRequest>(payload);
            if (data?.Ids == null || data.Ids.Count == 0)
            {
                return;
            }

            ApplyHiddenIds(data.Ids, data.Hidden);
        }

        private void SetHiddenState(object payload)
        {
            var data = ParsePayload<HiddenStateUpdate>(payload);
            var model = GetActiveModel();
            if (model == null)
            {
                return;
            }
            hiddenStateService.SaveHiddenIds(model, data?.HiddenIds ?? new List<string>());
        }

        private T ParsePayload<T>(object payload) where T : class
        {
            if (payload == null)
            {
                return null;
            }
            try
            {
                var json = JsonConvert.SerializeObject(payload);
                return JsonConvert.DeserializeObject<T>(json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[SolidLink] Payload parse failed: {ex.Message}");
                return null;
            }
        }

        private sealed class HiddenStateRequest
        {
            [JsonProperty("ids")]
            public List<string> Ids { get; set; } = new List<string>();

            [JsonProperty("includeDescendants")]
            public bool IncludeDescendants { get; set; }
        }

        private sealed class HiddenStateUpdate
        {
            [JsonProperty("hiddenIds")]
            public List<string> HiddenIds { get; set; } = new List<string>();
        }

        private sealed class RefGeometryHideRequest
        {
            [JsonProperty("ids")]
            public List<string> Ids { get; set; } = new List<string>();

            [JsonProperty("hidden")]
            public bool Hidden { get; set; }
        }

        protected override void OnClosed(EventArgs e)
        {
            bridge?.Dispose();
            base.OnClosed(e);
        }
    }
}
