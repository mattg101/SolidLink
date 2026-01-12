using System;
using System.IO;
using SolidLink.Addin.Services;
using SolidLink.Headless.Mocks;

namespace SolidLink.Headless
{
    public class HeadlessRunner
    {
        public HeadlessRunResult Run(HeadlessOptions options)
        {
            if (options == null)
            {
                return HeadlessRunResult.Failure("Options are required.");
            }

            if (string.IsNullOrWhiteSpace(options.FixturePath))
            {
                return HeadlessRunResult.Failure("Fixture path is required.");
            }

            if (!File.Exists(options.FixturePath))
            {
                return HeadlessRunResult.Failure($"Fixture file not found: {options.FixturePath}");
            }

            if (string.IsNullOrWhiteSpace(options.ReportsDirectory))
            {
                return HeadlessRunResult.Failure("Reports directory is required.");
            }

            Directory.CreateDirectory(options.ReportsDirectory);
            var reportPath = Path.Combine(options.ReportsDirectory, "headless-run.json");
            var diffPath = Path.Combine(options.ReportsDirectory, "diff-summary.txt");

            try
            {
                var context = new MockSolidWorksContext(options.FixturePath);
                var traverser = new TreeTraverser(context);
                var model = traverser.ExtractModel();

                var report = new HeadlessReport { Model = model };
                var normalizedReport = SnapshotNormalizer.NormalizeObject(report);

                File.WriteAllText(reportPath, normalizedReport);

                if (string.IsNullOrWhiteSpace(options.SnapshotPath))
                {
                    File.WriteAllText(diffPath, "Snapshot path not provided.");
                    return HeadlessRunResult.Failure("Snapshot path not provided.");
                }

                if (options.UpdateSnapshot)
                {
                    var snapshotDirectory = Path.GetDirectoryName(options.SnapshotPath);
                    if (!string.IsNullOrEmpty(snapshotDirectory))
                    {
                        Directory.CreateDirectory(snapshotDirectory);
                    }
                    File.WriteAllText(options.SnapshotPath, normalizedReport);
                    File.WriteAllText(diffPath, "Snapshot updated.");
                    return HeadlessRunResult.Success("Snapshot updated.");
                }

                if (!File.Exists(options.SnapshotPath))
                {
                    var message = $"Snapshot file not found: {options.SnapshotPath}";
                    File.WriteAllText(diffPath, message);
                    return HeadlessRunResult.Failure(message);
                }

                var expected = File.ReadAllText(options.SnapshotPath);
                var diff = SnapshotComparer.Compare(normalizedReport, expected);
                File.WriteAllText(diffPath, diff.Summary);

                if (diff.HasDifferences)
                {
                    return HeadlessRunResult.Diff(diff.Summary);
                }

                return HeadlessRunResult.Success("Headless run completed.");
            }
            catch (Exception ex)
            {
                var message = $"Headless run failed: {ex.Message}";
                File.WriteAllText(diffPath, message + Environment.NewLine + ex);
                return HeadlessRunResult.Failure(message);
            }
        }
    }

    public class HeadlessRunResult
    {
        private HeadlessRunResult(int exitCode, string message)
        {
            ExitCode = exitCode;
            Message = message;
        }

        public int ExitCode { get; }
        public string Message { get; }

        public static HeadlessRunResult Success(string message)
        {
            return new HeadlessRunResult(0, message);
        }

        public static HeadlessRunResult Diff(string message)
        {
            return new HeadlessRunResult(1, message);
        }

        public static HeadlessRunResult Failure(string message)
        {
            return new HeadlessRunResult(2, message);
        }
    }
}
