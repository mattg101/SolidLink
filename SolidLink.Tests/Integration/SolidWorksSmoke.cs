using NUnit.Framework;

namespace SolidLink.Tests.Integration
{
    [TestFixture]
    [Category("RequiresSW")]
    public class SolidWorksSmoke
    {
        [Test]
        public void RequiresSolidWorks()
        {
            Assert.Inconclusive("SolidWorks integration test requires a live SolidWorks session.");
        }
    }
}
