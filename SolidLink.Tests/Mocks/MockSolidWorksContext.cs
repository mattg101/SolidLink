using System.IO;
using Newtonsoft.Json;
using SolidLink.Addin.Abstractions;

namespace SolidLink.Tests.Mocks
{
    /// <summary>
    /// Mock implementation of ISolidWorksContext that loads data from JSON fixtures.
    /// </summary>
    public class MockSolidWorksContext : ISolidWorksContext
    {
        private readonly FixtureData _fixtureData;
        private IModelDocument _activeModel;

        public MockSolidWorksContext(string fixturePath)
        {
            if (!File.Exists(fixturePath))
            {
                throw new FileNotFoundException($"Fixture file not found: {fixturePath}");
            }

            var json = File.ReadAllText(fixturePath);
            _fixtureData = JsonConvert.DeserializeObject<FixtureData>(json);
        }

        public MockSolidWorksContext(FixtureData fixtureData)
        {
            _fixtureData = fixtureData;
        }

        public IModelDocument ActiveModel
        {
            get
            {
                if (_activeModel == null && _fixtureData != null)
                {
                    _activeModel = new MockModelDocument(_fixtureData);
                }
                return _activeModel;
            }
        }

        public bool IsConnected => _fixtureData != null;
    }
}
