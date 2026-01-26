using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
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
        private readonly RobotDefinitionStorage robotDefinitionStorage;
        private static readonly int[] DevPorts = new[] { 5173, 5174, 5175, 5176, 5177, 5178 };
        private static readonly TimeSpan DevProbeTimeout = TimeSpan.FromMilliseconds(300);

        public SolidLinkWindow(SldWorks app)
        {
            InitializeComponent();
            swApp = app ?? throw new ArgumentNullException(nameof(app));
            bridge = new MessageBridge();
            context = new SolidWorksContext(swApp);
            traverser = new TreeTraverser(context);
            hiddenStateService = new HiddenStateService();
            robotDefinitionStorage = new RobotDefinitionStorage(swApp);
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
                var uiUrl = await ResolveUiUrlAsync();
                System.Diagnostics.Debug.WriteLine($"[SolidLink] UI URL: {uiUrl}");
                webView.Source = new Uri(uiUrl);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to initialize WebView2: " + ex.Message);
            }
        }

        private static async Task<string> ResolveUiUrlAsync()
        {
            var overrideUrl = System.Environment.GetEnvironmentVariable("SOLIDLINK_UI_URL");
            if (!string.IsNullOrWhiteSpace(overrideUrl))
            {
                return overrideUrl;
            }

            foreach (var port in DevPorts)
            {
                var url = $"http://localhost:{port}/";
                if (await CanReachAsync(url))
                {
                    return url;
                }
            }

            return "http://localhost:5173";
        }

        private static async Task<bool> CanReachAsync(string url)
        {
            try
            {
                using var cts = new CancellationTokenSource(DevProbeTimeout);
                using var client = new HttpClient { Timeout = DevProbeTimeout };
                using var response = await client.GetAsync(url, cts.Token);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
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
                        HandleRobotDefinitionLoad();
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
            else if (message.Type == "ROBOT_DEF_SAVE")
            {
                HandleRobotDefinitionSave(message.Payload);
            }
            else if (message.Type == "ROBOT_DEF_SAVE_VERSION")
            {
                HandleRobotDefinitionSaveVersion(message.Payload);
            }
            else if (message.Type == "ROBOT_DEF_LOAD")
            {
                HandleRobotDefinitionLoad();
            }
            else if (message.Type == "ROBOT_DEF_LOAD_FILE")
            {
                HandleRobotDefinitionLoadFile();
            }
            else if (message.Type == "ROBOT_DEF_LOAD_VERSION")
            {
                HandleRobotDefinitionLoadVersion(message.Payload);
            }
            else if (message.Type == "ROBOT_DEF_HISTORY_REQUEST")
            {
                HandleRobotDefinitionHistoryRequest();
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

        private void HandleRobotDefinitionSave(object payload)
        {
            var model = GetActiveModel();
            if (model == null)
            {
                return;
            }

            var definition = ConvertPayloadToDefinition(payload);
            if (definition == null)
            {
                SendError("Failed to save robot definition: invalid payload.");
                return;
            }

            var record = robotDefinitionStorage.SaveCurrent(model, definition);
            if (record == null)
            {
                SendError("Failed to save robot definition.");
                return;
            }
            SendRobotDefinitionHistory(model, record);
        }

        private void HandleRobotDefinitionSaveVersion(object payload)
        {
            var model = GetActiveModel();
            if (model == null)
            {
                return;
            }

            var request = ParsePayload<RobotDefinitionSaveVersionRequest>(payload);
            if (request?.Definition == null || string.IsNullOrWhiteSpace(request.Message))
            {
                SendError("Commit message required to save a version.");
                return;
            }

            var record = robotDefinitionStorage.SaveVersion(model, request.Definition, request.Message);
            if (record == null)
            {
                SendError("Failed to save robot definition version.");
                return;
            }
            SendRobotDefinitionHistory(model, record);
        }

        private void HandleRobotDefinitionLoad()
        {
            var model = GetActiveModel();
            if (model == null)
            {
                return;
            }

            var record = robotDefinitionStorage.LoadAssociated(model);
            if (record?.Definition != null)
            {
                bridge.Send("ROBOT_DEF_LOAD", record.Definition);
            }
            SendRobotDefinitionHistory(model, record);
        }

        private void HandleRobotDefinitionLoadFile()
        {
            var model = GetActiveModel();
            if (model == null)
            {
                return;
            }

            var dialog = new OpenFileDialog
            {
                Filter = "SolidLink Robot Definition (*.solidlink.json;*.json)|*.solidlink.json;*.json|All files (*.*)|*.*",
                Multiselect = false,
                CheckFileExists = true,
                Title = "Load Robot Definition"
            };

            if (dialog.ShowDialog() != true)
            {
                return;
            }

            var record = robotDefinitionStorage.LoadFromFile(dialog.FileName);
            if (record?.Definition == null)
            {
                SendError("Failed to load robot definition file.");
                return;
            }

            record = robotDefinitionStorage.SaveRecord(model, record, dialog.FileName);
            if (record?.Definition != null)
            {
                bridge.Send("ROBOT_DEF_LOAD", record.Definition);
            }
            SendRobotDefinitionHistory(model, record);
        }

        private void HandleRobotDefinitionLoadVersion(object payload)
        {
            var model = GetActiveModel();
            if (model == null)
            {
                return;
            }

            var request = ParsePayload<RobotDefinitionLoadVersionRequest>(payload);
            if (request == null || string.IsNullOrWhiteSpace(request.Id))
            {
                SendError("Invalid version request.");
                return;
            }

            var version = robotDefinitionStorage.FindVersion(model, request.Id);
            if (version?.Definition != null)
            {
                bridge.Send("ROBOT_DEF_LOAD", version.Definition);
            }
            else
            {
                SendError("Requested version not found.");
            }
            SendRobotDefinitionHistory(model, null);
        }

        private void HandleRobotDefinitionHistoryRequest()
        {
            var model = GetActiveModel();
            SendRobotDefinitionHistory(model, null);
        }

        private void SendError(string message)
        {
            if (string.IsNullOrWhiteSpace(message)) return;
            bridge.Send("ERROR_RESPONSE", message);
        }

        private void SendRobotDefinitionHistory(ModelDoc2 model, RobotDefinitionRecord record)
        {
            if (model == null)
            {
                bridge.Send("ROBOT_DEF_HISTORY", new { history = new List<object>() });
                return;
            }

            record ??= robotDefinitionStorage.LoadAssociated(model);
            var history = record?.History?
                .Select(version => (object)new
                {
                    id = version.Id,
                    message = version.Message,
                    timestampUtc = version.TimestampUtc
                })
                .ToList() ?? new List<object>();

            bridge.Send("ROBOT_DEF_HISTORY", new
            {
                history,
                linkedPath = record?.LinkedDefinitionPath,
                modelPath = record?.ModelPath ?? model.GetPathName()
            });
        }

        private static JToken ConvertPayloadToDefinition(object payload)
        {
            if (payload == null) return null;
            if (payload is JToken token) return token;
            try
            {
                return JToken.FromObject(payload);
            }
            catch
            {
                try
                {
                    var json = JsonConvert.SerializeObject(payload);
                    return JToken.Parse(json);
                }
                catch
                {
                    return null;
                }
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

        private sealed class RobotDefinitionSaveVersionRequest
        {
            [JsonProperty("definition")]
            public JToken Definition { get; set; }

            [JsonProperty("message")]
            public string Message { get; set; }
        }

        private sealed class RobotDefinitionLoadVersionRequest
        {
            [JsonProperty("id")]
            public string Id { get; set; }
        }

        protected override void OnClosed(EventArgs e)
        {
            bridge?.Dispose();
            base.OnClosed(e);
        }
    }
}
