using System;
using System.IO;

namespace SolidLink.Addin.Services
{
    /// <summary>
    /// File-based logger for diagnostic output. Creates a new log file each run.
    /// Logs are written to: SolidLink/logs/
    /// </summary>
    public static class DiagnosticLogger
    {
        private static readonly string LogDirectory;
        private static readonly string LogFilePath;
        private static readonly object LockObj = new object();
        private static bool _initialized = false;

        static DiagnosticLogger()
        {
            // Write logs to the SolidLink project directory for easy access
            string baseDir = Path.GetDirectoryName(typeof(DiagnosticLogger).Assembly.Location);
            // Go up from bin/x64/Debug to SolidLink.Addin, then to SolidLink root
            LogDirectory = Path.Combine(baseDir, "..", "..", "..", "logs");
            
            // Create timestamped log file
            string timestamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
            LogFilePath = Path.Combine(LogDirectory, $"solidlink_{timestamp}.log");
        }

        private static void EnsureInitialized()
        {
            if (_initialized) return;
            lock (LockObj)
            {
                if (_initialized) return;
                try
                {
                    Directory.CreateDirectory(LogDirectory);
                    File.WriteAllText(LogFilePath, $"=== SolidLink Diagnostic Log ===\nStarted: {DateTime.Now}\n\n");
                    _initialized = true;
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[DiagnosticLogger] Failed to initialize: {ex.Message}");
                }
            }
        }

        public static void Log(string message)
        {
            EnsureInitialized();
            if (!_initialized) return;

            lock (LockObj)
            {
                try
                {
                    string timestamp = DateTime.Now.ToString("HH:mm:ss.fff");
                    File.AppendAllText(LogFilePath, $"[{timestamp}] {message}\n");
                }
                catch { /* Ignore write failures */ }
            }
        }

        public static void LogComponent(string name, string parent, double[] transform)
        {
            Log($"Component: {name}");
            Log($"  Parent: {parent}");
            if (transform != null && transform.Length >= 13)
            {
                Log($"  Rotation Row1: [{transform[0]:F4}, {transform[1]:F4}, {transform[2]:F4}]");
                Log($"  Rotation Row2: [{transform[3]:F4}, {transform[4]:F4}, {transform[5]:F4}]");
                Log($"  Rotation Row3: [{transform[6]:F4}, {transform[7]:F4}, {transform[8]:F4}]");
                Log($"  Translation: [{transform[9]:F4}, {transform[10]:F4}, {transform[11]:F4}]");
                Log($"  Scale: {transform[12]:F4}");
            }
            else
            {
                Log($"  Transform: (null or incomplete)");
            }
        }

        public static void LogMesh(string componentName, int vertexCount, float[] firstVertex)
        {
            if (firstVertex != null && firstVertex.Length >= 3)
            {
                Log($"  Mesh: {vertexCount} verts, First: [{firstVertex[0]:F4}, {firstVertex[1]:F4}, {firstVertex[2]:F4}]");
            }
            else
            {
                Log($"  Mesh: {vertexCount} verts");
            }
        }

        public static string GetLogFilePath()
        {
            EnsureInitialized();
            return LogFilePath;
        }
    }
}
