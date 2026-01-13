using System;
using System.Runtime.InteropServices;

namespace SolidLink.Addin.Adapters
{
    internal static class ComHelpers
    {
        public static void SafeCall(Action action)
        {
            try
            {
                action?.Invoke();
            }
            catch
            {
            }
        }

        public static T SafeCall<T>(Func<T> action, T fallback = default(T))
        {
            try
            {
                return action != null ? action() : fallback;
            }
            catch
            {
                return fallback;
            }
        }

        public static void ReleaseComObject(object comObject)
        {
            try
            {
                if (comObject != null && Marshal.IsComObject(comObject))
                {
                    Marshal.FinalReleaseComObject(comObject);
                }
            }
            catch
            {
            }
        }
    }
}
