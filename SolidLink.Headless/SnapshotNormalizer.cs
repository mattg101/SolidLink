using System;
using System.Globalization;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SolidLink.Headless
{
    public static class SnapshotNormalizer
    {
        private const int NumericPrecision = 6;

        public static string NormalizeObject(object payload)
        {
            var serializer = CreateSerializer();
            var token = JToken.FromObject(payload, serializer);
            NormalizeToken(token);
            return SerializeNormalized(token);
        }

        public static string NormalizeJson(string json)
        {
            var token = JToken.Parse(json);
            NormalizeToken(token);
            return SerializeNormalized(token);
        }

        private static void NormalizeToken(JToken token)
        {
            if (token == null)
            {
                return;
            }

            switch (token.Type)
            {
                case JTokenType.Object:
                    NormalizeObjectToken((JObject)token);
                    break;
                case JTokenType.Array:
                    NormalizeArrayToken((JArray)token);
                    break;
                case JTokenType.Float:
                case JTokenType.Integer:
                    NormalizeNumericValue((JValue)token);
                    break;
            }
        }

        private static void NormalizeObjectToken(JObject obj)
        {
            var properties = obj.Properties().ToList();
            foreach (var property in properties)
            {
                if (string.Equals(property.Name, "id", StringComparison.OrdinalIgnoreCase))
                {
                    property.Remove();
                    continue;
                }

                NormalizeToken(property.Value);
            }
        }

        private static void NormalizeArrayToken(JArray array)
        {
            for (int i = 0; i < array.Count; i++)
            {
                NormalizeToken(array[i]);
            }

            if (array.Count == 0 || array[0].Type != JTokenType.Object)
            {
                return;
            }

            var hasName = false;
            var hasReference = false;
            foreach (var token in array)
            {
                var obj = token as JObject;
                if (obj == null)
                {
                    return;
                }

                hasName |= obj.Property("name") != null;
                hasReference |= obj.Property("referencePath") != null;
            }

            if (!hasName && !hasReference)
            {
                return;
            }

            var comparer = new JObjectComparer(hasName, hasReference);
            var ordered = array.ToArray();
            Array.Sort(ordered, comparer);
            array.Clear();
            foreach (var token in ordered)
            {
                array.Add(token);
            }
        }

        private static void NormalizeNumericValue(JValue value)
        {
            if (value.Type != JTokenType.Float)
            {
                return;
            }

            var doubleValue = Convert.ToDouble(value.Value, CultureInfo.InvariantCulture);
            value.Value = Math.Round(doubleValue, NumericPrecision, MidpointRounding.AwayFromZero);
        }

        private static string SerializeNormalized(JToken token)
        {
            var serializer = CreateSerializer();
            using (var writer = new StringWriter(CultureInfo.InvariantCulture))
            using (var jsonWriter = new JsonTextWriter(writer) { Formatting = Formatting.Indented })
            {
                serializer.Serialize(jsonWriter, token);
                return writer.ToString();
            }
        }

        private static JsonSerializer CreateSerializer()
        {
            return JsonSerializer.Create(new JsonSerializerSettings
            {
                Culture = CultureInfo.InvariantCulture,
                FloatFormatHandling = FloatFormatHandling.DefaultValue,
                Formatting = Formatting.Indented
            });
        }

        private class JObjectComparer : System.Collections.Generic.IComparer<JToken>
        {
            private readonly bool _hasName;
            private readonly bool _hasReferencePath;

            public JObjectComparer(bool hasName, bool hasReferencePath)
            {
                _hasName = hasName;
                _hasReferencePath = hasReferencePath;
            }

            public int Compare(JToken x, JToken y)
            {
                var xObj = x as JObject;
                var yObj = y as JObject;
                if (xObj == null || yObj == null)
                {
                    return 0;
                }

                var xKey = BuildKey(xObj);
                var yKey = BuildKey(yObj);
                return string.CompareOrdinal(xKey, yKey);
            }

            private string BuildKey(JObject obj)
            {
                var name = _hasName ? (string)obj["name"] : null;
                var reference = _hasReferencePath ? (string)obj["referencePath"] : null;
                return string.Concat(name ?? string.Empty, "|", reference ?? string.Empty);
            }
        }
    }
}
