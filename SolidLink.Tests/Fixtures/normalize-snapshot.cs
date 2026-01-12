using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace SolidLink.Tests.Fixtures
{
    public sealed class SnapshotSchemaException : Exception
    {
        public SnapshotSchemaException(string message, IReadOnlyList<string> errors)
            : base(message)
        {
            Errors = errors ?? Array.Empty<string>();
        }

        public IReadOnlyList<string> Errors { get; }
    }

    public static class SnapshotNormalizer
    {
        private const int NumericPrecision = 6;
        private static readonly StringComparer NameComparer = StringComparer.Ordinal;

        public static string Normalize(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                throw new ArgumentException("Snapshot JSON is required.", nameof(json));
            }

            JToken token;
            try
            {
                token = JToken.Parse(json, new JsonLoadSettings
                {
                    LineInfoHandling = LineInfoHandling.Load
                });
            }
            catch (JsonReaderException ex)
            {
                var message = $"Invalid JSON at line {ex.LineNumber}, position {ex.LinePosition}: {ex.Message}";
                throw new SnapshotSchemaException(message, new[] { message });
            }

            var errors = Validate(token);
            if (errors.Count > 0)
            {
                throw new SnapshotSchemaException("Snapshot schema validation failed.", errors);
            }

            var normalized = NormalizeRoot((JObject)token);
            return SerializeNormalized(normalized);
        }

        public static IReadOnlyList<string> Validate(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return new[] { "Snapshot JSON is required." };
            }

            try
            {
                var token = JToken.Parse(json, new JsonLoadSettings
                {
                    LineInfoHandling = LineInfoHandling.Load
                });
                return Validate(token);
            }
            catch (JsonReaderException ex)
            {
                return new[]
                {
                    $"Invalid JSON at line {ex.LineNumber}, position {ex.LinePosition}: {ex.Message}"
                };
            }
        }

        public static IReadOnlyList<string> Validate(JToken token)
        {
            var errors = new List<string>();
            var root = token as JObject;
            if (root == null)
            {
                errors.Add("Root value must be a JSON object.");
                return errors;
            }

            ValidateRoot(root, "$", errors);
            return errors;
        }

        private static JObject NormalizeRoot(JObject root)
        {
            var normalized = new JObject
            {
                ["title"] = root["title"]?.Value<string>() ?? string.Empty,
                ["type"] = root["type"]?.Value<string>() ?? string.Empty
            };

            if (root.TryGetValue("unitToMeters", out var unitToken))
            {
                normalized["unitToMeters"] = NormalizeNumber(unitToken);
            }

            normalized["rootComponent"] = NormalizeComponent((JObject)root["rootComponent"]);
            return normalized;
        }

        private static JObject NormalizeComponent(JObject component)
        {
            var normalized = new JObject
            {
                ["name"] = component["name"]?.Value<string>() ?? string.Empty,
                ["transform"] = NormalizeNumberArray((JArray)component["transform"]),
                ["materialColor"] = NormalizeNumberArray((JArray)component["materialColor"])
            };

            normalized["bodies"] = NormalizeBodies((JArray)component["bodies"]);
            normalized["children"] = NormalizeChildren((JArray)component["children"]);
            normalized["referenceFrames"] = NormalizeReferenceFrames((JArray)component["referenceFrames"]);
            return normalized;
        }

        private static JArray NormalizeBodies(JArray bodies)
        {
            var normalized = new JArray();
            foreach (var body in bodies.OfType<JObject>().OrderBy(b => b["name"]?.Value<string>() ?? string.Empty, NameComparer))
            {
                var normalizedBody = new JObject
                {
                    ["name"] = body["name"]?.Value<string>() ?? string.Empty,
                    ["tessellation"] = NormalizeNumberArray((JArray)body["tessellation"])
                };
                normalized.Add(normalizedBody);
            }

            return normalized;
        }

        private static JArray NormalizeChildren(JArray children)
        {
            var normalized = new JArray();
            var indexedChildren = children
                .Select((child, index) => new { Child = (JObject)child, Index = index })
                .OrderBy(item => item.Child["name"]?.Value<string>() ?? string.Empty, NameComparer)
                .ThenBy(item => item.Index);

            foreach (var entry in indexedChildren)
            {
                normalized.Add(NormalizeComponent(entry.Child));
            }

            return normalized;
        }

        private static JArray NormalizeReferenceFrames(JArray frames)
        {
            var normalized = new JArray();
            var indexedFrames = frames
                .Select((frame, index) => new { Frame = (JObject)frame, Index = index })
                .OrderBy(item => item.Frame["name"]?.Value<string>() ?? string.Empty, NameComparer)
                .ThenBy(item => item.Frame["type"]?.Value<string>() ?? string.Empty, NameComparer)
                .ThenBy(item => item.Index);

            foreach (var entry in indexedFrames)
            {
                var normalizedFrame = new JObject
                {
                    ["name"] = entry.Frame["name"]?.Value<string>() ?? string.Empty,
                    ["type"] = entry.Frame["type"]?.Value<string>() ?? string.Empty,
                    ["transform"] = NormalizeNumberArray((JArray)entry.Frame["transform"])
                };
                normalized.Add(normalizedFrame);
            }

            return normalized;
        }

        private static JArray NormalizeNumberArray(JArray numbers)
        {
            var normalized = new JArray();
            foreach (var number in numbers)
            {
                normalized.Add(NormalizeNumber(number));
            }

            return normalized;
        }

        private static JValue NormalizeNumber(JToken token)
        {
            if (token.Type == JTokenType.Integer)
            {
                return new JValue(token.Value<long>());
            }

            var value = token.Value<double>();
            var rounded = Math.Round(value, NumericPrecision, MidpointRounding.AwayFromZero);
            return new JValue(rounded);
        }

        private static string SerializeNormalized(JObject normalized)
        {
            using (var writer = new StringWriter(CultureInfo.InvariantCulture))
            using (var jsonWriter = new JsonTextWriter(writer))
            {
                jsonWriter.Formatting = Formatting.Indented;
                jsonWriter.Culture = CultureInfo.InvariantCulture;

                var serializer = new JsonSerializer
                {
                    Culture = CultureInfo.InvariantCulture
                };
                serializer.Serialize(jsonWriter, normalized);
                return writer.ToString();
            }
        }

        private static void ValidateRoot(JObject root, string path, List<string> errors)
        {
            ValidateAllowedProperties(root, path, errors, "title", "type", "unitToMeters", "rootComponent");
            ValidateRequiredString(root, path, errors, "title");
            ValidateRequiredString(root, path, errors, "type");
            ValidateOptionalNumber(root, path, errors, "unitToMeters");
            ValidateRequiredObject(root, path, errors, "rootComponent", ValidateComponent);
        }

        private static void ValidateComponent(JObject component, string path, List<string> errors)
        {
            ValidateAllowedProperties(component, path, errors, "name", "transform", "materialColor", "bodies", "children", "referenceFrames");
            ValidateRequiredString(component, path, errors, "name");
            ValidateRequiredNumberArray(component, path, errors, "transform");
            ValidateRequiredNumberArray(component, path, errors, "materialColor");
            ValidateRequiredArray(component, path, errors, "bodies", ValidateBody);
            ValidateRequiredArray(component, path, errors, "children", ValidateComponent);
            ValidateRequiredArray(component, path, errors, "referenceFrames", ValidateReferenceFrame);
        }

        private static void ValidateBody(JObject body, string path, List<string> errors)
        {
            ValidateAllowedProperties(body, path, errors, "name", "tessellation");
            ValidateRequiredString(body, path, errors, "name");
            ValidateRequiredNumberArray(body, path, errors, "tessellation");
        }

        private static void ValidateReferenceFrame(JObject frame, string path, List<string> errors)
        {
            ValidateAllowedProperties(frame, path, errors, "name", "type", "transform");
            ValidateRequiredString(frame, path, errors, "name");
            ValidateRequiredString(frame, path, errors, "type");
            ValidateRequiredNumberArray(frame, path, errors, "transform");
        }

        private static void ValidateAllowedProperties(JObject obj, string path, List<string> errors, params string[] allowed)
        {
            var allowedSet = new HashSet<string>(allowed, StringComparer.Ordinal);
            foreach (var property in obj.Properties())
            {
                if (!allowedSet.Contains(property.Name))
                {
                    errors.Add($"{path}.{property.Name}: unexpected field.");
                }
            }
        }

        private static void ValidateRequiredString(JObject obj, string path, List<string> errors, string field)
        {
            if (!obj.TryGetValue(field, out var token))
            {
                errors.Add($"{path}.{field}: required field is missing.");
                return;
            }

            if (token.Type != JTokenType.String || string.IsNullOrWhiteSpace(token.Value<string>()))
            {
                errors.Add($"{path}.{field}: must be a non-empty string.");
            }
        }

        private static void ValidateOptionalNumber(JObject obj, string path, List<string> errors, string field)
        {
            if (!obj.TryGetValue(field, out var token))
            {
                return;
            }

            if (token.Type != JTokenType.Integer && token.Type != JTokenType.Float)
            {
                errors.Add($"{path}.{field}: must be a number.");
                return;
            }

            if (IsInvalidNumber(token))
            {
                errors.Add($"{path}.{field}: NaN or Infinity is not supported.");
            }
        }

        private static void ValidateRequiredObject(JObject obj, string path, List<string> errors, string field, Action<JObject, string, List<string>> validate)
        {
            if (!obj.TryGetValue(field, out var token))
            {
                errors.Add($"{path}.{field}: required field is missing.");
                return;
            }

            var child = token as JObject;
            if (child == null)
            {
                errors.Add($"{path}.{field}: must be an object.");
                return;
            }

            validate(child, $"{path}.{field}", errors);
        }

        private static void ValidateRequiredArray(JObject obj, string path, List<string> errors, string field, Action<JObject, string, List<string>> validateItem)
        {
            if (!obj.TryGetValue(field, out var token))
            {
                errors.Add($"{path}.{field}: required field is missing.");
                return;
            }

            var array = token as JArray;
            if (array == null)
            {
                errors.Add($"{path}.{field}: must be an array.");
                return;
            }

            for (var i = 0; i < array.Count; i++)
            {
                var child = array[i] as JObject;
                if (child == null)
                {
                    errors.Add($"{path}.{field}[{i}]: must be an object.");     
                    continue;
                }

                validateItem(child, $"{path}.{field}[{i}]", errors);
            }
        }

        private static void ValidateRequiredNumberArray(JObject obj, string path, List<string> errors, string field)
        {
            if (!obj.TryGetValue(field, out var token))
            {
                errors.Add($"{path}.{field}: required field is missing.");
                return;
            }

            var array = token as JArray;
            if (array == null)
            {
                errors.Add($"{path}.{field}: must be an array.");
                return;
            }

            for (var i = 0; i < array.Count; i++)
            {
                var entry = array[i];
                if (entry.Type != JTokenType.Integer && entry.Type != JTokenType.Float)
                {
                    errors.Add($"{path}.{field}[{i}]: must be a number.");
                    continue;
                }

                if (IsInvalidNumber(entry))
                {
                    errors.Add($"{path}.{field}[{i}]: NaN or Infinity is not supported.");
                }
            }
        }

        private static bool IsInvalidNumber(JToken token)
        {
            var value = token.Value<double>();
            return double.IsNaN(value) || double.IsInfinity(value);
        }
    }
}
