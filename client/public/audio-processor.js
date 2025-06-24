// Audio processor worklet for real-time PCM conversion
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        if (this.bufferIndex >= this.bufferSize) {
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            pcmData[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
          }
          
          // Send PCM data to main thread
          this.port.postMessage(pcmData.buffer);
          
          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }
    
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);