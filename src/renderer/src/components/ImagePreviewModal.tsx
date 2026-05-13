import React, { useEffect, useRef, useState } from 'react'

interface Props {
  imageSrc: string
  onClose: () => void
}

export default function ImagePreviewModal({ imageSrc, onClose }: Props) {
  const [loaded, setLoaded] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // 挂载后立即让遮罩层获得焦点，确保键盘事件能被捕获
  useEffect(() => {
    overlayRef.current?.focus()
  }, [])

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      tabIndex={-1}
      style={{ background: 'rgba(0,0,0,0.85)', cursor: 'zoom-out', outline: 'none' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        {!loaded && (
          <div style={{ color: 'white', padding: 20, fontSize: 14 }}>加载中...</div>
        )}
        <img
          src={imageSrc}
          onLoad={() => setLoaded(true)}
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            display: loaded ? 'block' : 'none',
            borderRadius: 6,
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}
          alt="预览"
        />
        <button
          className="btn"
          onClick={onClose}
          style={{
            position: 'absolute', top: -14, right: -14,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)', border: 'none',
            padding: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700
          }}
        >✕</button>
        <div style={{
          position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.55)', fontSize: 12, whiteSpace: 'nowrap', pointerEvents: 'none'
        }}>
          点击背景 或 按 ESC 关闭
        </div>
      </div>
    </div>
  )
}
