import { similarity } from './similarity.js'

// A ContentEngine turns an idea into draft posts. v1 = bank only; an API engine can replace it later.
export function bankEngine(db) {
  return {
    id: 'bank',
    async generate({ idea }) {
      const ids = db.ideas.filter((i) => similarity(i.text, idea) >= 0.6).map((i) => i.id)
      return db.posts.filter((p) => ids.includes(p.ideaId))
    },
  }
}

export function buildChatPrompt({ idea, month, mix, competitors, insights, pkg = null }) {
  const comps = competitors.map((c) => `- ${c.name}${c.sample?.notes ? `: ${c.sample.notes}` : ''}`).join('\n')
  const ins = insights.map((i) => `- ${i}`).join('\n')
  return `أنت كاتب محتوى سوشيال ميديا لمعمل تحاليل مصري اسمه Trust Labs (شعار «معمل تثق به»). النبرة: مصرية بسيطة، خفيفة، إيموجي قليل.

الفكرة / نوع التحليل: ${idea}
${pkg?.name ? `اسم الباقة: ${pkg.name}${pkg.price ? ` · السعر: ${Number(pkg.price).toLocaleString('en-US')} جنيه` : ''}\n` : ''}الشهر: ${month}
توزيع المنشورات المطلوب: ${JSON.stringify(mix)}

المنافسين (للتميز عنهم):
${comps}

أهم الملاحظات:
${ins}

القواعد: no medical promises (ممنوع وعد بنتيجة أو تشخيص، استخدم صياغة «اطمّن / افحص بدري»). عنوان قصير 2-3 كلمات. نص اللوح: سطر خدمة + 4 نقاط بالظبط. ممنوع كتابة اسم المعمل بالعربي في الصورة.

اكتب الإجابة كـ JSON فقط بالشكل ده (مصفوفة posts):
{
  "schemaVersion": 1,
  "posts": [
    { "id": "...", "ideaId": "...", "type": "post|reel|carousel|story", "platform": "facebook|instagram", "date": "YYYY-MM-DD", "time": "HH:mm",
      "headline": "", "caption": "", "hashtags": ["#..."], "panelService": "", "panelBullets": ["","","",""],
      "image": { "concept": "", "subject": "", "mood": "", "accent": "" }, "status": "idea" }
  ]
}`
}
