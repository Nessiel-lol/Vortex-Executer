using System.Runtime.InteropServices;

namespace Vortex;

public static class ExecutorAPI
{
    [DllImport("vertox_api.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern void NativeInject();

    [DllImport("vertox_api.dll", CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private static extern void NativeExecute([MarshalAs(UnmanagedType.LPStr)] string script);

    public static (bool Success, string Message) Inject()
    {
        try
        {
            NativeInject();
            return (true, "Vortex attached successfully!");
        }
        catch (DllNotFoundException)
        {
            return (false, "vertox_api.dll not found. Make sure it is next to the executable.");
        }
        catch (EntryPointNotFoundException)
        {
            return (false, "Inject entry point not found in vertox_api.dll.");
        }
        catch (Exception ex)
        {
            return (false, $"Injection failed: {ex.Message}");
        }
    }

    public static (bool Success, string Message) Execute(string script)
    {
        try
        {
            NativeExecute(script);
            return (true, "Script executed successfully!");
        }
        catch (DllNotFoundException)
        {
            return (false, "vertox_api.dll not found. Make sure it is next to the executable.");
        }
        catch (EntryPointNotFoundException)
        {
            return (false, "Execute entry point not found in vertox_api.dll.");
        }
        catch (Exception ex)
        {
            return (false, $"Execution failed: {ex.Message}");
        }
    }
}
