using System.Collections.Generic;
using Newtonsoft.Json;

namespace SolidLink.Addin.Model
{
    public class RobotModel
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("rootFrame")]
        public Frame RootFrame { get; set; }

        public RobotModel()
        {
            Name = "New Robot";
        }
    }
}
