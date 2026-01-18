using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using SolidWorks.Interop.sldworks;

namespace SolidLink.Addin.Services
{
    public class HiddenStateService
    {
        private readonly string _storagePath;

        public HiddenStateService()
        {
            var appData = System.Environment.GetFolderPath(System.Environment.SpecialFolder.LocalApplicationData);
            _storagePath = Path.Combine(appData, "SolidLink", "hidden_states.json");
        }

        public IEnumerable<string> LoadHiddenIds(ModelDoc2 model)
        {
            if (model == null) return Enumerable.Empty<string>();

            var store = LoadStore();
            var key = GetModelKey(model);

            return store.TryGetValue(key, out var ids) ? ids : Enumerable.Empty<string>();
        }

        public void SaveHiddenIds(ModelDoc2 model, IEnumerable<string> ids)
        {
            if (model == null) return;

            var store = LoadStore();
            var key = GetModelKey(model);

            if (ids == null || !ids.Any())
            {
                if (store.ContainsKey(key))
                {
                    store.Remove(key);
                    SaveStore(store);
                }
                return;
            }

            store[key] = ids.ToList();
            SaveStore(store);
        }

        private string GetModelKey(ModelDoc2 model)
        {
            // Use file path if saved, otherwise title
            var path = model.GetPathName();
            return string.IsNullOrEmpty(path) ? model.GetTitle() : path;
        }

        private Dictionary<string, List<string>> LoadStore()
        {
            try
            {
                if (!File.Exists(_storagePath))
                {
                    return new Dictionary<string, List<string>>();
                }

                var json = File.ReadAllText(_storagePath);
                return JsonConvert.DeserializeObject<Dictionary<string, List<string>>>(json) 
                       ?? new Dictionary<string, List<string>>();
            }
            catch
            {
                return new Dictionary<string, List<string>>();
            }
        }

        private void SaveStore(Dictionary<string, List<string>> store)
        {
            try
            {
                var dir = Path.GetDirectoryName(_storagePath);
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                var json = JsonConvert.SerializeObject(store, Formatting.Indented);
                File.WriteAllText(_storagePath, json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[SolidLink] Failed to save hidden states: {ex.Message}");
            }
        }
    }
}

