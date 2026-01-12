using System.IO;
using Newtonsoft.Json;
using SolidLink.Addin.Abstractions;

namespace SolidLink.Headless.Mocks
{
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
