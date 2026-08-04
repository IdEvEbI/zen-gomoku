/**
 * 棋谱文件下载 / 选择上传（仅 Web DOM）
 */

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'application/json'
): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      reject(new Error('读取文件失败'))
    }
    reader.readAsText(file, 'utf-8')
  })
}
