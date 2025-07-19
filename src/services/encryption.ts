// Simple encryption service for document storage
class EncryptionService {
  private key = 'arkive-encryption-key-2025'; // In production, use proper key management

  // Simple XOR encryption for demo purposes
  // In production, use proper encryption like AES
  encrypt(data: string): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
      );
    }
    return btoa(result); // Base64 encode
  }

  decrypt(encryptedData: string): string {
    try {
      const data = atob(encryptedData); // Base64 decode
      let result = '';
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(
          data.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
        );
      }
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  // Convert file to base64 for storage
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:mime;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Convert base64 back to blob for download
  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

export const encryption = new EncryptionService();