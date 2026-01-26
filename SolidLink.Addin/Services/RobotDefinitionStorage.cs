using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SolidLink.Addin.Adapters;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace SolidLink.Addin.Services
{
    public class RobotDefinitionStorage
    {
        private readonly SldWorks _swApp;
        private const string AttributeName = "SolidLink Robot Definition (v1)";
        private const double AttributeVersion = 1.0;
        internal const string SchemaVersion = "solidlink_robot_def_v1";

        public RobotDefinitionStorage(SldWorks swApp)
        {
            _swApp = swApp ?? throw new ArgumentNullException(nameof(swApp));
        }

        public RobotDefinitionRecord LoadAssociated(ModelDoc2 model)
        {
            if (model == null) return null;

            var record = LoadFromAttribute(model);
            if (record == null)
            {
                var sidecarPath = GetSidecarPath(model.GetPathName());
                record = LoadFromFile(sidecarPath);
            }

            if (record == null) return null;

            if (!string.IsNullOrWhiteSpace(record.LinkedDefinitionPath) && File.Exists(record.LinkedDefinitionPath))
            {
                var linked = LoadFromFile(record.LinkedDefinitionPath);
                if (linked != null)
                {
                    linked.LinkedDefinitionPath = record.LinkedDefinitionPath;
                    linked.ModelPath = record.ModelPath;
                    return linked;
                }
            }

            return record;
        }

        public RobotDefinitionRecord SaveCurrent(ModelDoc2 model, JToken definition, string linkedDefinitionPath = null)
        {
            if (model == null || definition == null) return null;

            var record = LoadAssociated(model) ?? new RobotDefinitionRecord();
            record.Definition = definition;
            return SaveRecord(model, record, linkedDefinitionPath);
        }

        public RobotDefinitionRecord SaveVersion(ModelDoc2 model, JToken definition, string message, string linkedDefinitionPath = null)
        {
            if (model == null || definition == null) return null;
            if (string.IsNullOrWhiteSpace(message)) return null;

            var record = LoadAssociated(model) ?? new RobotDefinitionRecord();
            record.Definition = definition;

            var nextIndex = 1;
            if (record.History.Count > 0)
            {
                nextIndex = record.History.Max(v => v.VersionIndex) + 1;
            }

            record.History.Add(new RobotDefinitionVersion
            {
                Id = Guid.NewGuid().ToString("N"),
                VersionIndex = nextIndex,
                Message = message ?? string.Empty,
                TimestampUtc = DateTime.UtcNow.ToString("o"),
                Definition = definition.DeepClone()
            });

            return SaveRecord(model, record, linkedDefinitionPath);
        }

        public RobotDefinitionRecord SaveRecord(ModelDoc2 model, RobotDefinitionRecord record, string linkedDefinitionPath = null)
        {
            if (model == null || record == null) return null;

            record.Schema = SchemaVersion;
            record.ModelPath = model.GetPathName();
            record.LinkedDefinitionPath = linkedDefinitionPath ?? record.LinkedDefinitionPath;
            record.UpdatedUtc = DateTime.UtcNow.ToString("o");

            SaveToSidecar(model, record);
            SaveToAttribute(model, record);
            return record;
        }

        public RobotDefinitionRecord LoadFromFile(string path)
        {
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return null;
            try
            {
                var json = File.ReadAllText(path);
                var record = JsonConvert.DeserializeObject<RobotDefinitionRecord>(json);
                return NormalizeRecord(record);
            }
            catch
            {
                return null;
            }
        }

        public RobotDefinitionVersion FindVersion(ModelDoc2 model, string versionId)
        {
            if (string.IsNullOrWhiteSpace(versionId)) return null;
            var record = LoadAssociated(model);
            return record?.History?.FirstOrDefault(v => v.Id == versionId);
        }

        public IReadOnlyList<RobotDefinitionHistoryEntry> GetHistory(ModelDoc2 model)
        {
            var record = LoadAssociated(model);
            if (record?.History == null) return Array.Empty<RobotDefinitionHistoryEntry>();
            return record.History
                .Select(v => new RobotDefinitionHistoryEntry
                {
                    Id = v.Id,
                    VersionIndex = v.VersionIndex,
                    Message = v.Message,
                    TimestampUtc = v.TimestampUtc
                })
                .ToList();
        }

        public RobotDefinitionRecord LinkToDefaultSidecar(ModelDoc2 model)
        {
            if (model == null) return null;
            var record = LoadAssociated(model);
            if (record?.Definition == null) return null;
            var sidecarPath = GetSidecarPath(model.GetPathName());
            if (string.IsNullOrWhiteSpace(sidecarPath)) return null;
            return SaveRecord(model, record, sidecarPath);
        }

        private void SaveToSidecar(ModelDoc2 model, RobotDefinitionRecord record)
        {
            var modelPath = model?.GetPathName();
            var sidecarPath = GetSidecarPath(modelPath);
            if (string.IsNullOrWhiteSpace(sidecarPath)) return;
            try
            {
                var json = JsonConvert.SerializeObject(record, Formatting.Indented);
                File.WriteAllText(sidecarPath, json);
            }
            catch
            {
                DiagnosticLogger.Log($"[RobotDefinitionStorage] Failed to write sidecar: {sidecarPath}");
            }
        }

        private void SaveToAttribute(ModelDoc2 model, RobotDefinitionRecord record)
        {
            if (model == null || record == null) return;
            try
            {
                var json = JsonConvert.SerializeObject(record);
                var attribute = GetOrCreateAttribute(model);
                if (attribute == null) return;

                int configOption = (int)swInConfigurationOpts_e.swAllConfiguration;
                var param = attribute.GetParameter("data");
                param?.SetStringValue2(json, configOption, "");
                param = attribute.GetParameter("date");
                param?.SetStringValue2(DateTime.UtcNow.ToString("o"), configOption, "");
                param = attribute.GetParameter("version");
                param?.SetDoubleValue2(AttributeVersion, configOption, "");
                param = attribute.GetParameter("linkedPath");
                param?.SetStringValue2(record.LinkedDefinitionPath ?? string.Empty, configOption, "");
            }
            catch
            {
            }
        }

        private RobotDefinitionRecord LoadFromAttribute(ModelDoc2 model)
        {
            try
            {
                var attribute = FindAttribute(model);
                if (attribute == null) return null;
                var param = attribute.GetParameter("data");
                var data = param?.GetStringValue();
                if (string.IsNullOrWhiteSpace(data)) return null;
                var record = JsonConvert.DeserializeObject<RobotDefinitionRecord>(data);
                if (record == null) return null;
                var linkedParam = attribute.GetParameter("linkedPath");
                var linkedPath = linkedParam?.GetStringValue();
                if (!string.IsNullOrWhiteSpace(linkedPath))
                {
                    record.LinkedDefinitionPath = linkedPath;
                }
                return NormalizeRecord(record);
            }
            catch
            {
                return null;
            }
        }

        private SolidWorks.Interop.sldworks.Attribute FindAttribute(ModelDoc2 model)
        {
            if (model == null) return null;
            Feature feature = null;
            try
            {
                var features = model.FeatureManager?.GetFeatures(true) as object[];
                if (features == null) return null;

                foreach (var obj in features)
                {
                    feature = obj as Feature;
                    if (feature == null) continue;
                    if (feature.GetTypeName2() != "Attribute") continue;

                    var attr = feature.GetSpecificFeature2() as SolidWorks.Interop.sldworks.Attribute;
                    if (attr != null && attr.GetName() == AttributeName)
                    {
                        return attr;
                    }
                }
            }
            finally
            {
                ComHelpers.ReleaseComObject(feature);
            }
            return null;
        }

        private SolidWorks.Interop.sldworks.Attribute GetOrCreateAttribute(ModelDoc2 model)
        {
            var existing = FindAttribute(model);
            if (existing != null) return existing;

            AttributeDef def = _swApp.DefineAttribute(AttributeName);
            def.AddParameter("data", (int)swParamType_e.swParamTypeString, 0, 0);
            def.AddParameter("date", (int)swParamType_e.swParamTypeString, 0, 0);
            def.AddParameter("version", (int)swParamType_e.swParamTypeDouble, AttributeVersion, 0);
            def.AddParameter("linkedPath", (int)swParamType_e.swParamTypeString, 0, 0);
            def.Register();

            int configOption = (int)swInConfigurationOpts_e.swAllConfiguration;
            return def.CreateInstance5(model, null, AttributeName, 0, configOption);
        }

        private static string GetSidecarPath(string modelPath)
        {
            if (string.IsNullOrWhiteSpace(modelPath)) return null;
            var directory = Path.GetDirectoryName(modelPath);
            var filename = Path.GetFileNameWithoutExtension(modelPath);
            if (string.IsNullOrWhiteSpace(directory) || string.IsNullOrWhiteSpace(filename)) return null;
            return Path.Combine(directory, $"{filename}.solidlink.json");
        }

        private static RobotDefinitionRecord NormalizeRecord(RobotDefinitionRecord record)
        {
            if (record == null) return null;
            record.History ??= new List<RobotDefinitionVersion>();
            if (string.IsNullOrWhiteSpace(record.Schema))
            {
                record.Schema = SchemaVersion;
            }
            return record;
        }
    }

    public class RobotDefinitionRecord
    {
        [JsonProperty("schema")]
        public string Schema { get; set; } = RobotDefinitionStorage.SchemaVersion;

        [JsonProperty("modelPath")]
        public string ModelPath { get; set; }

        [JsonProperty("linkedDefinitionPath")]
        public string LinkedDefinitionPath { get; set; }

        [JsonProperty("updatedUtc")]
        public string UpdatedUtc { get; set; }

        [JsonProperty("definition")]
        public JToken Definition { get; set; }

        [JsonProperty("history")]
        public List<RobotDefinitionVersion> History { get; set; } = new List<RobotDefinitionVersion>();
    }

    public class RobotDefinitionVersion
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("versionNumber")]
        public int VersionIndex { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }

        [JsonProperty("timestampUtc")]
        public string TimestampUtc { get; set; }

        [JsonProperty("definition")]
        public JToken Definition { get; set; }
    }

    public class RobotDefinitionHistoryEntry
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("versionNumber")]
        public int VersionIndex { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }

        [JsonProperty("timestampUtc")]
        public string TimestampUtc { get; set; }
    }
}
