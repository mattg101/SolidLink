using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using Newtonsoft.Json;
using SolidLink.Addin.Adapters;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace SolidLink.Addin.Services
{
    public sealed class HiddenStateService
    {
        private const string PropertyName = "SolidLink.HiddenState";

        public List<string> LoadHiddenIds(ModelDoc2 model)
        {
            if (model == null)
            {
                return new List<string>();
            }

            ModelDocExtension extension = null;
            CustomPropertyManager manager = null;
            try
            {
                extension = model.Extension;
                manager = extension.CustomPropertyManager[string.Empty];
                string rawValue;
                string resolvedValue;
                manager.Get4(PropertyName, false, out rawValue, out resolvedValue);

                var json = string.IsNullOrWhiteSpace(resolvedValue) ? rawValue : resolvedValue;
                if (string.IsNullOrWhiteSpace(json))
                {
                    return new List<string>();
                }

                var state = JsonConvert.DeserializeObject<HiddenStatePayload>(json);
                return state?.HiddenIds?
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .Distinct()
                    .ToList() ?? new List<string>();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[SolidLink] Hidden state load failed: {ex.Message}");
                return new List<string>();
            }
            finally
            {
                ComHelpers.ReleaseComObject(manager);
                ComHelpers.ReleaseComObject(extension);
            }
        }

        public void SaveHiddenIds(ModelDoc2 model, IEnumerable<string> hiddenIds)
        {
            if (model == null)
            {
                return;
            }

            var ids = hiddenIds?
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct()
                .ToList() ?? new List<string>();

            var payload = JsonConvert.SerializeObject(new HiddenStatePayload { HiddenIds = ids });

            ModelDocExtension extension = null;
            CustomPropertyManager manager = null;
            try
            {
                extension = model.Extension;
                manager = extension.CustomPropertyManager[string.Empty];
                manager.Add3(
                    PropertyName,
                    (int)swCustomInfoType_e.swCustomInfoText,
                    payload,
                    (int)swCustomPropertyAddOption_e.swCustomPropertyDeleteAndAdd
                );
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[SolidLink] Hidden state save failed: {ex.Message}");
            }
            finally
            {
                ComHelpers.ReleaseComObject(manager);
                ComHelpers.ReleaseComObject(extension);
            }
        }

        private sealed class HiddenStatePayload
        {
            [JsonProperty("hiddenIds")]
            public List<string> HiddenIds { get; set; } = new List<string>();
        }
    }
}
