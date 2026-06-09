"use client";

import React from "react";
import { useTheme } from "@/context/theme-context";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200/50 dark:border-zinc-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 overflow-hidden"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -20, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="text-zinc-700 dark:text-zinc-300"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 fill-current text-violet-600" />
          ) : (
            <Sun className="w-5 h-5 fill-current text-amber-500" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
