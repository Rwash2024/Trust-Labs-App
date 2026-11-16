const HOTLINE = '16183' // allowed in captions/overlays, never in the image prompt

const or = (v, fallback) => (String(v || '').trim() ? String(v).trim() : fallback)

// Format-specific shooting/design plans, derived from the post's own fields (nothing extra is stored).
export function buildFormatPlan(post) {
  const headline = or(post.headline, 'اطمّن على صحتك')
  const service = or(post.panelService, 'اسأل عن باقة الاطمئنان')
  const b = post.panelBullets.map((x, i) => or(x, `تحليل مهم رقم ${i + 1}`))

  if (post.type === 'reel') {
    return {
      title: 'سيناريو الريل (حوالي 20 ثانية)',
      steps: [
        `0-3 ث (الخطاف): نص كبير على المشهد «${headline}؟» مع لقطة قريبة من فكرة الصورة.`,
        `3-10 ث: لقطات سريعة تعرض «${b[0]}» و«${b[1]}» بنص قصير على الشاشة.`,
        `10-17 ث: «${b[2]}» و«${b[3]}»، وبعدها جملة طمأنة بسيطة بدون وعود بنتيجة.`,
        `17-20 ث (الدعوة): «${service}» + اتصل ${HOTLINE} أو احجز زيارة منزلية.`,
      ],
    }
  }
  if (post.type === 'story') {
    return {
      title: 'خطة الاستوري (3 إطارات)',
      steps: [
        `الإطار 1: سؤال «${headline}؟» مع ستيكر استطلاع (نعم / لسه).`,
        `الإطار 2: «${service}» والنقاط: ${b.join('، ')}.`,
        `الإطار 3: دعوة للحجز، اتصل ${HOTLINE} وستيكر رابط «احجز دلوقتي».`,
      ],
    }
  }
  if (post.type === 'carousel') {
    return {
      title: 'خطة الكاروسيل (6 شرائح)',
      steps: [
        `الشريحة 1 (الغلاف): «${headline}» بخط كبير وصورة الفكرة.`,
        `الشريحة 2: ${b[0]} (سطر واحد يشرح ليه مهم).`,
        `الشريحة 3: ${b[1]} (سطر واحد يشرح ليه مهم).`,
        `الشريحة 4: ${b[2]} (سطر واحد يشرح ليه مهم).`,
        `الشريحة 5: ${b[3]} (سطر واحد يشرح ليه مهم).`,
        `الشريحة 6 (الختام): «${service}» + اتصل ${HOTLINE}.`,
      ],
    }
  }
  return null
}
