import React, { useState } from 'react';
import { Copy, Check, FileJson, Mail, Globe, Code, ShoppingBag } from 'lucide-react';
import { ZineMetadata } from '../types';
import { buildShopifyProductFromZine } from '../services/shopifyExportService';

interface ZineSyndicationBridgeProps {
  metadata: ZineMetadata;
}

export const ZineSyndicationBridge: React.FC<ZineSyndicationBridgeProps> = ({ metadata }) => {
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const triggerCopy = async (text: string, mode: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode(null), 2000);
    } catch (err) {
      console.error('Failed to copy syndicated text:', err);
    }
  };

  // 1. Export as Portable JSON (Perfect for developer pipelines or headless CMS APIs)
  const getJsonPayload = (): string => {
    const payload = {
      source: 'Mimi Editorial Intelligence',
      issue_title: metadata.title,
      date_published: new Date(metadata.timestamp).toISOString(),
      creator: metadata.userHandle,
      oracular_claim: metadata.content?.oracular_mirror || '',
      strategic_thesis: metadata.content?.strategic_hypothesis || '',
      semiotic_elements: metadata.content?.semiotic_signals?.map((s: any) => ({
        motif: s.motif,
        context: s.context
      })) || [],
      pages: metadata.content?.pages?.map((p: any, i: number) => ({
        index: i + 1,
        headline: p.headline,
        bodyCopy: p.bodyCopy,
        image: p.image_url
      })) || []
    };
    return JSON.stringify(payload, null, 2);
  };

  // 2. Export as Pre-Styled HTML (Optimized for rich-text copy-pasting directly into Substack)
  const getSubstackHtml = (): string => {
    const pagesHtml = metadata.content?.pages?.map((p: any, i: number) => `
      <hr />
      <p style="font-family: monospace; font-size: 11px; color: #666;">FIG_0${i+1} // VISUAL PLATE</p>
      <h2 style="font-family: Georgia, serif; font-size: 28px; font-style: italic; color: #111; margin-top: 10px;">${p.headline}</h2>
      <img src="${p.image_url}" alt="${p.headline}" style="width: 100%; max-width: 600px; height: auto; filter: grayscale(100%); margin: 20px 0;" />
      <p style="font-family: Georgia, serif; font-size: 16px; line-height: 1.6; color: #333; text-align: justify;">${p.bodyCopy}</p>
    `).join('\n') || '';

    return `<div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <p style="font-family: monospace; font-size: 10px; letter-spacing: 2px; color: #888;">Issue Manifest // compiled via Mimi</p>
      <h1 style="font-family: Georgia, serif; font-size: 42px; font-style: italic; font-weight: normal; color: #111; margin: 10px 0;">${metadata.title}</h1>
      <p style="font-family: Georgia, serif; font-size: 18px; font-style: italic; color: #555;">"${metadata.content?.oracular_mirror || ''}"</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-left: 3px solid #111; margin: 30px 0;">
        <h3 style="font-family: sans-serif; font-size: 12px; text-transform: uppercase; margin: 0 0 10px 0;">Strategic Thesis:</h3>
        <p style="font-family: Georgia, serif; font-size: 15px; font-style: italic; line-height: 1.5; margin: 0;">${metadata.content?.strategic_hypothesis || ''}</p>
      </div>
      
      ${pagesHtml}
      
      <hr />
      <p style="font-family: monospace; font-size: 9px; text-align: center; color: #999; margin-top: 40px;">Mimi Sovereign Archive. All Rights Reserved.</p>
    </div>`;
  };

  return (
    <div className="border border-nous-border bg-white dark:bg-[#080808] p-5 font-mono text-xs text-stone-800 dark:text-stone-300">
      <div className="flex justify-between items-center border-b border-nous-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-stone-500" />
          <span className="font-sans font-bold uppercase tracking-wider text-[10px]">Syndication Bridge</span>
        </div>
        <span className="text-[9px] text-stone-400">PUBLISH_V1.0</span>
      </div>

      <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-normal mb-5 uppercase tracking-wide font-medium">
        Translate your zines into portable publication formats to port directly to Substack, headless CMS systems, or blogs.
      </p>

      <div className="flex flex-col gap-2">
        {/* Substack HTML Copier */}
        <button
          onClick={() => triggerCopy(getSubstackHtml(), 'substack')}
          className="w-full flex items-center justify-between border border-nous-border bg-stone-500/5 hover:bg-stone-500/10 px-4 py-3 rounded-none transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-[#141414] dark:text-[#fcfcfa]">
            <Mail className="w-3.5 h-3.5 text-orange-500" />
            Copy Substack HTML Block
          </div>
          {copiedMode === 'substack' ? <Check className="w-3.5 h-3.5 text-green-500 animate-pulse" /> : <Code className="w-3.5 h-3.5 text-[#a8a29e]" />}
        </button>

        {/* Portable API JSON Copier */}
        <button
          onClick={() => triggerCopy(getJsonPayload(), 'json')}
          className="w-full flex items-center justify-between border border-nous-border bg-stone-500/5 hover:bg-stone-500/10 px-4 py-3 rounded-none transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-[#141414] dark:text-[#fcfcfa]">
            <FileJson className="w-3.5 h-3.5 text-blue-500" />
            Copy Headless JSON Schema
          </div>
          {copiedMode === 'json' ? <Check className="w-3.5 h-3.5 text-green-500 animate-pulse" /> : <Code className="w-3.5 h-3.5 text-[#a8a29e]" />}
        </button>

        <button
          onClick={() =>
            triggerCopy(
              JSON.stringify(buildShopifyProductFromZine(metadata).jsonLd, null, 2),
              'shopify-jsonld',
            )
          }
          className="w-full flex items-center justify-between border border-nous-border bg-stone-500/5 hover:bg-stone-500/10 px-4 py-3 rounded-none transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-[#141414] dark:text-[#fcfcfa]">
            <ShoppingBag className="w-3.5 h-3.5 text-[#95BF47]" />
            Copy Shopify Product JSON-LD
          </div>
          {copiedMode === 'shopify-jsonld' ? <Check className="w-3.5 h-3.5 text-green-500 animate-pulse" /> : <Code className="w-3.5 h-3.5 text-[#a8a29e]" />}
        </button>
      </div>
    </div>
  );
};
