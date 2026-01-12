using System;
using System.IO;

namespace SolidLink.Headless
{
    internal static class Program
    {
        private static int Main(string[] args)
        {
            var options = ParseArgs(args);
            if (options == null)
            {
                return 0;
            }

            var runner = new HeadlessRunner();
            var result = runner.Run(options);
            Console.WriteLine(result.Message);
            return result.ExitCode;
        }

        private static HeadlessOptions ParseArgs(string[] args)
        {
            if (args != null)
            {
                foreach (var arg in args)
                {
                    if (string.Equals(arg, "--help", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(arg, "-h", StringComparison.OrdinalIgnoreCase))
                    {
                        PrintUsage();
                        return null;
                    }
                }
            }

            var cwd = Environment.CurrentDirectory;
            var options = new HeadlessOptions
            {
                FixturePath = Path.Combine(cwd, "SolidLink.Tests", "Fixtures", "assembly_simple.json"),
                SnapshotPath = Path.Combine(cwd, "SolidLink.Tests", "Fixtures", "snapshots", "assembly_simple.snapshot.json"),
                ReportsDirectory = Path.Combine(cwd, "reports")
            };

            if (args == null)
            {
                return options;
            }

            for (int i = 0; i < args.Length; i++)
            {
                var arg = args[i];
                if (string.Equals(arg, "--fixture", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    options.FixturePath = ResolvePath(args[++i], cwd);
                }
                else if (string.Equals(arg, "--snapshot", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    options.SnapshotPath = ResolvePath(args[++i], cwd);
                }
                else if (string.Equals(arg, "--reports-dir", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    options.ReportsDirectory = ResolvePath(args[++i], cwd);
                }
                else if (string.Equals(arg, "--update-snapshot", StringComparison.OrdinalIgnoreCase))
                {
                    options.UpdateSnapshot = true;
                }
            }

            return options;
        }

        private static string ResolvePath(string input, string baseDir)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return input;
            }

            return Path.IsPathRooted(input) ? input : Path.GetFullPath(Path.Combine(baseDir, input));
        }

        private static void PrintUsage()
        {
            Console.WriteLine("Usage: SolidLink.Headless [options]");
            Console.WriteLine("  --fixture <path>       Path to fixture JSON.");
            Console.WriteLine("  --snapshot <path>      Path to expected snapshot JSON.");
            Console.WriteLine("  --reports-dir <path>   Output directory for reports.");
            Console.WriteLine("  --update-snapshot      Overwrite expected snapshot with current output.");
            Console.WriteLine("  --help                 Show this help.");
        }
    }
}
