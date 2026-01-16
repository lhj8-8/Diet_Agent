// frontend/src/hooks/useFloatingWidgets.js
import { useState, useRef, useEffect } from "react";

const useFloatingWidgets = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const editorRef = useRef(null);
  const chatRef = useRef(null); // Need a ref for chat too for click outside
  const memoRef = useRef(null); // Need a ref for memo for click outside


  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => insertImage(reader.result);
    reader.readAsDataURL(file);
  };

  const insertImage = (src) => {
    const editor = editorRef.current;
    if (!editor) return;

    const wrapper = document.createElement("div");
    wrapper.className = "image-wrapper";

    const img = document.createElement("img");
    img.src = src;
    img.className = "note-image";

    const del = document.createElement("button");
    del.className = "img-delete-btn";
    del.textContent = "✕";
    del.onclick = () => wrapper.remove();

    wrapper.appendChild(img);
    wrapper.appendChild(del);
    editor.appendChild(wrapper);
  };

  /* 바깥 클릭 닫기 (from App.jsx, but relevant here now) */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (memoOpen && memoRef.current && !memoRef.current.contains(e.target)) {
        setMemoOpen(false);
      }
      if (chatOpen && chatRef.current && !chatRef.current.contains(e.target)) {
        setChatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [memoOpen, chatOpen]);


  return {
    chatOpen,
    setChatOpen,
    memoOpen,
    setMemoOpen,
    editorRef,
    handleDrop,
    insertImage,
    chatRef,
    memoRef,
  };
};

export default useFloatingWidgets;