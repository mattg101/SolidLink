using System;
using System.Collections.Generic;
using System.Text;

namespace SolidLink.Headless
{
    public static class SnapshotComparer
    {
        public static DiffResult Compare(string actualJson, string expectedJson)
        {
            var normalizedActual = SnapshotNormalizer.NormalizeJson(actualJson);
            var normalizedExpected = SnapshotNormalizer.NormalizeJson(expectedJson);

            if (string.Equals(normalizedActual, normalizedExpected, StringComparison.Ordinal))
            {
                return DiffResult.NoDiff(normalizedActual);
            }

            var summary = BuildDiffSummary(normalizedActual, normalizedExpected, 20, out var diffCount);
            return DiffResult.WithDiff(normalizedActual, summary, diffCount);
        }

        private static string BuildDiffSummary(string actual, string expected, int maxLines, out int diffCount)
        {
            var actualLines = SplitLines(actual);
            var expectedLines = SplitLines(expected);
            var totalLines = Math.Max(actualLines.Count, expectedLines.Count);
            var lines = new List<string>();
            diffCount = 0;

            for (int i = 0; i < totalLines; i++)
            {
                var actualLine = i < actualLines.Count ? actualLines[i] : "<missing>";
                var expectedLine = i < expectedLines.Count ? expectedLines[i] : "<missing>";
                if (string.Equals(actualLine, expectedLine, StringComparison.Ordinal))
                {
                    continue;
                }

                diffCount++;
                if (lines.Count < maxLines)
                {
                    lines.Add($"Line {i + 1}: expected: {expectedLine}");
                    lines.Add($"Line {i + 1}: actual:   {actualLine}");
                }
            }

            var builder = new StringBuilder();
            builder.AppendLine($"Differences detected: {diffCount}");
            if (lines.Count == 0)
            {
                return builder.ToString();
            }

            builder.AppendLine("First differences:");
            foreach (var line in lines)
            {
                builder.AppendLine(line);
            }

            return builder.ToString();
        }

        private static List<string> SplitLines(string value)
        {
            return new List<string>(value.Replace("\r\n", "\n").Split('\n'));
        }
    }

    public class DiffResult
    {
        private DiffResult(bool hasDifferences, string normalizedActual, string summary, int diffCount)
        {
            HasDifferences = hasDifferences;
            NormalizedActual = normalizedActual;
            Summary = summary;
            DiffCount = diffCount;
        }

        public bool HasDifferences { get; }
        public string NormalizedActual { get; }
        public string Summary { get; }
        public int DiffCount { get; }

        public static DiffResult NoDiff(string normalizedActual)
        {
            return new DiffResult(false, normalizedActual, "No diffs detected.", 0);
        }

        public static DiffResult WithDiff(string normalizedActual, string summary, int diffCount)
        {
            return new DiffResult(true, normalizedActual, summary, diffCount);
        }
    }
}
