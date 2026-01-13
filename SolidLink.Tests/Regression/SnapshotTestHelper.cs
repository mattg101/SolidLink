using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SolidLink.Addin.Model;
using SolidLink.Addin.Services;
using SolidLink.Tests.Mocks;

namespace SolidLink.Tests.Regression
{
    public static class SnapshotTestHelper
    {
        public static string GenerateNormalizedSnapshot(string fixturePath)
        {
            var context = new MockSolidWorksContext(fixturePath);
            var traverser = new TreeTraverser(context);
            var model = traverser.ExtractModel(context.ActiveModel);

            NormalizeFrameIds(model?.RootFrame, null);

            return JsonConvert.SerializeObject(model, Formatting.Indented);
        }

        public static bool SnapshotsMatch(string expectedJson, string actualJson, out string diffSummary)
        {
            var expectedToken = JToken.Parse(expectedJson);
            var actualToken = JToken.Parse(actualJson);

            NormalizeNumericTokens(expectedToken);
            NormalizeNumericTokens(actualToken);

            if (JToken.DeepEquals(expectedToken, actualToken))
            {
                diffSummary = string.Empty;
                return true;
            }

            var expectedNormalized = expectedToken.ToString(Formatting.Indented);
            var actualNormalized = actualToken.ToString(Formatting.Indented);
            diffSummary = BuildDiffSummary(expectedNormalized, actualNormalized);
            return false;
        }

        private static void NormalizeFrameIds(Frame frame, string parentPath)
        {
            if (frame == null)
            {
                return;
            }

            var path = string.IsNullOrEmpty(parentPath) ? frame.Name : $"{parentPath}/{frame.Name}";
            frame.Id = path;

            foreach (var child in frame.Children)
            {
                NormalizeFrameIds(child, path);
            }
        }

        private static void NormalizeNumericTokens(JToken token)
        {
            if (token == null)
            {
                return;
            }

            switch (token.Type)
            {
                case JTokenType.Object:
                    foreach (var property in ((JObject)token).Properties())
                    {
                        NormalizeNumericTokens(property.Value);
                    }
                    break;
                case JTokenType.Array:
                    foreach (var item in (JArray)token)
                    {
                        NormalizeNumericTokens(item);
                    }
                    break;
                case JTokenType.Integer:
                case JTokenType.Float:
                    var value = token.Value<double>();
                    ((JValue)token).Value = Math.Round(value, 6);
                    break;
            }
        }

        private static string BuildDiffSummary(string expectedJson, string actualJson)
        {
            var expectedLines = SplitLines(expectedJson);
            var actualLines = SplitLines(actualJson);
            var lineCount = Math.Min(expectedLines.Length, actualLines.Length);

            for (int i = 0; i < lineCount; i++)
            {
                if (!string.Equals(expectedLines[i], actualLines[i], StringComparison.Ordinal))
                {
                    return $"Diff at line {i + 1}:{Environment.NewLine}Expected: {expectedLines[i]}{Environment.NewLine}Actual:   {actualLines[i]}";
                }
            }

            if (expectedLines.Length != actualLines.Length)
            {
                return $"Diff at line {lineCount + 1}: expected {expectedLines.Length} lines, actual {actualLines.Length} lines.";
            }

            return "Snapshots differ.";
        }

        private static string[] SplitLines(string value)
        {
            return value.Replace("\r\n", "\n").Replace("\r", "\n").Split('\n');
        }
    }
}
