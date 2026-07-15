// ============================================================
// NovaChat - Stories Page
// ============================================================
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiX, FiEye, FiHeart } from "react-icons/fi";
import { storyAPI } from "../services/api";
import toast from "react-hot-toast";

export default function StoriesPage() {
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStory, setActiveStory] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data } = await storyAPI.getFeed();
        setStories(data.stories || []);
      } catch {
        toast.error("Failed to load stories");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStories();
  }, []);

  const openStory = async (storyGroup, index = 0) => {
    setActiveStory(storyGroup);
    setActiveIndex(index);
    // Mark as viewed
    try {
      await storyAPI.view(storyGroup.stories[index]._id);
    } catch {}
  };

  const nextStory = () => {
    if (activeStory && activeIndex < activeStory.stories.length - 1) {
      setActiveIndex(i => i + 1);
    } else {
      setActiveStory(null);
    }
  };

  const prevStory = () => {
    if (activeIndex > 0) setActiveIndex(i => i - 1);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Stories</h1>

        {/* Add Story */}
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 mb-6">
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button className="w-16 h-16 rounded-full border-2 border-dashed border-nova-500/40 flex items-center justify-center text-nova-400 hover:border-nova-400 hover:bg-nova-500/10 transition-all">
              <FiPlus size={24} />
            </button>
            <span className="text-xs text-slate-500">Add Story</span>
          </div>

          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-white/5" />
                <div className="h-2 w-12 bg-white/5 rounded" />
              </div>
            ))
          ) : (
            stories.map((storyGroup, i) => (
              <motion.div
                key={storyGroup.author._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                onClick={() => openStory(storyGroup)}
              >
                <div className={`p-0.5 rounded-full ${storyGroup.hasUnviewed ? "story-ring" : "story-ring-viewed"}`}>
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-dark-100">
                    {storyGroup.author.avatar?.url ? (
                      <img src={storyGroup.author.avatar.url} alt={storyGroup.author.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white font-bold">
                        {storyGroup.author.displayName?.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-400 max-w-[60px] truncate text-center">{storyGroup.author.displayName}</span>
              </motion.div>
            ))
          )}
        </div>

        {stories.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">📖</div>
            <h2 className="text-xl font-semibold text-white mb-2">No stories yet</h2>
            <p className="text-slate-500 text-sm">Stories from your contacts will appear here</p>
          </div>
        )}
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <div className="relative w-full max-w-sm h-screen sm:h-[90vh] sm:rounded-3xl overflow-hidden">
              {/* Progress bars */}
              <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
                {activeStory.stories.map((_, i) => (
                  <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-none"
                      style={{
                        width: i < activeIndex ? "100%" : i === activeIndex ? `${progress}%` : "0%",
                        transition: i === activeIndex ? "width 5s linear" : "none",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-8 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {activeStory.author.avatar?.url ? (
                      <img src={activeStory.author.avatar.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-sm font-bold">
                        {activeStory.author.displayName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{activeStory.author.displayName}</p>
                    <p className="text-white/60 text-xs">2 hours ago</p>
                  </div>
                </div>
                <button onClick={() => setActiveStory(null)} className="text-white/80 hover:text-white">
                  <FiX size={24} />
                </button>
              </div>

              {/* Story content */}
              <div className="w-full h-full bg-dark-300">
                {activeStory.stories[activeIndex]?.media?.url ? (
                  <img
                    src={activeStory.stories[activeIndex].media.url}
                    alt="Story"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-nova-gradient flex items-center justify-center p-8">
                    <p className="text-white text-2xl font-semibold text-center">
                      {activeStory.stories[activeIndex]?.text?.content || "Story"}
                    </p>
                  </div>
                )}
              </div>

              {/* Caption */}
              {activeStory.stories[activeIndex]?.caption && (
                <div className="absolute bottom-20 left-4 right-4 z-10">
                  <p className="text-white text-sm text-center bg-black/40 backdrop-blur rounded-xl px-4 py-2">
                    {activeStory.stories[activeIndex].caption}
                  </p>
                </div>
              )}

              {/* Navigation zones */}
              <button className="absolute left-0 top-0 w-1/3 h-full z-20" onClick={prevStory} />
              <button className="absolute right-0 top-0 w-1/3 h-full z-20" onClick={nextStory} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
