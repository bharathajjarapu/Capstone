using System.Security.Cryptography;
using System.Text;

namespace VenDot.Utils;

/// <summary>
/// Cryptographically secure temporary passwords for admin-created accounts.
/// </summary>
public static class PasswordGenerator
{
    private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Lower = "abcdefghijkmnopqrstuvwxyz";
    private const string Digits = "23456789";
    private const string Special = "!@#$%&*";

    public static string GenerateTemporaryPassword(int length = 14)
    {
        if (length < 12) length = 12;

        var required = new[]
        {
            Pick(Upper),
            Pick(Lower),
            Pick(Digits),
            Pick(Special)
        };

        var all = Upper + Lower + Digits + Special;
        var chars = new char[length];
        var idx = 0;
        foreach (var c in required)
            chars[idx++] = c;

        while (idx < length)
            chars[idx++] = Pick(all);

        Shuffle(chars);
        return new string(chars);
    }

    private static char Pick(string set)
    {
        var i = RandomNumberGenerator.GetInt32(set.Length);
        return set[i];
    }

    private static void Shuffle(char[] array)
    {
        for (var i = array.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (array[i], array[j]) = (array[j], array[i]);
        }
    }
}
