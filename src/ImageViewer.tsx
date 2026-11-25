import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import VaultModal from './VaultModal';

export default function ImageViewer({ images, initialIndex, onClose }: {
  images: readonly string[]; initialIndex: number; onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const changeImage = (next: number) => { setIndex(next); setZoom(1); };
  return <VaultModal className="image-viewer-modal" label="Bild vergrößern" onClose={onClose}>
    <header className="image-viewer-header">
      <button className="icon-btn" type="button" onClick={onClose} aria-label="Bild schließen"><ArrowLeft size={22}/></button>
      <strong>Bild {index+1} / {images.length}</strong>
      <span className="image-viewer-percent">{Math.round(zoom*100)} %</span>
    </header>
    <div className="image-viewer-scroll" key={index + ':' + zoom}>
      <div className="image-viewer-canvas" style={{width: (zoom*100)+'%',height:(zoom*100)+'%'}}>
        <img src={images[index]} alt={'Anhang '+(index+1)} draggable={false}/>
      </div>
    </div>
    <footer className="image-viewer-controls">
      <button className="icon-btn" type="button" disabled={index===0} aria-label="Vorheriges Bild" onClick={()=>changeImage(index-1)}><ChevronLeft size={22}/></button>
      <button className="icon-btn" type="button" disabled={zoom<=1} aria-label="Verkleinern" onClick={()=>setZoom(z=>Math.max(1,z-.5))}><Minus size={22}/></button>
      <button className="icon-btn" type="button" aria-label="Originalansicht" onClick={()=>setZoom(1)}><RotateCcw size={20}/></button>
      <button className="icon-btn" type="button" disabled={zoom>=4} aria-label="Vergrößern" onClick={()=>setZoom(z=>Math.min(4,z+.5))}><Plus size={22}/></button>
      <button className="icon-btn" type="button" disabled={index===images.length-1} aria-label="Nächstes Bild" onClick={()=>changeImage(index+1)}><ChevronRight size={22}/></button>
    </footer>
  </VaultModal>;
}
