using System;
using System.IO;
using NUnit.Framework;

namespace SolidLink.Tests.Regression
{
    [TestFixture]
    [Category("Regression")]
    public class SnapshotBaselineTests
    {
        private string _fixturesPath;

        [SetUp]
        public void SetUp()
        {
            var assemblyDir = Path.GetDirectoryName(typeof(SnapshotBaselineTests).Assembly.Location);
            _fixturesPath = Path.Combine(assemblyDir ?? string.Empty, "Fixtures");
        }

        [TestCase("assembly_simple.json", "assembly_simple.snapshot.json")]
        [TestCase("assembly_with_transforms.json", "assembly_with_transforms.snapshot.json")]
        public void FixtureSnapshot_MatchesBaseline(string fixtureFile, string baselineFile)
        {
            var fixturePath = Path.Combine(_fixturesPath, fixtureFile);
            var baselinePath = Path.Combine(_fixturesPath, baselineFile);

            if (!File.Exists(fixturePath))
            {
                Assert.Fail($"Fixture file not found: {fixturePath}");
            }

            if (!File.Exists(baselinePath))
            {
                Assert.Fail($"Baseline snapshot missing: {baselinePath}");
            }

            var actualJson = SnapshotTestHelper.GenerateNormalizedSnapshot(fixturePath);
            var expectedJson = File.ReadAllText(baselinePath);

            if (!SnapshotTestHelper.SnapshotsMatch(expectedJson, actualJson, out var diff))
            {
                Assert.Fail($"Snapshot mismatch for {baselineFile}.{Environment.NewLine}{diff}");
            }
        }
    }
}
