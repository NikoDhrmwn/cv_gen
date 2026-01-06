export interface TemplateSection {
    id: string;
    name: string;
    type: 'basics' | 'work' | 'education' | 'skills' | 'custom' | 'projects' | 'languages' | 'interests' | 'unknown';

    // Mustache block bounds (safe to use for display)
    containerStart: number;
    containerEnd: number;
    containerHtml: string;

    // Header info (for display only, renaming is risky)
    headerText?: string;

    // Slot Layout (sidebar/main)
    slot?: 'sidebar' | 'main';
}

/**
 * Simple and SAFE template parser that only captures Mustache blocks.
 * Does NOT attempt aggressive container detection to avoid breaking templates.
 * 
 * NOTE: Reordering is currently DISABLED because moving Mustache blocks
 * without their surrounding HTML containers causes template corruption.
 */
/**
 * Parse template sections from HTML and include all sections from resume_data.
 * This ensures the layout menu shows ALL sections, even if they're empty.
 * 
 * @param html - HTML template string
 * @param resumeData - Optional resume data object containing all sections
 * @param formSchema - Optional form schema to identify all defined sections
 */
export function parseTemplateSections(
    html: string,
    resumeData?: any,
    formSchema?: any
): TemplateSection[] {
    const sections: TemplateSection[] = [];
    const standardSections = ['work', 'education', 'skills', 'projects', 'certificates', 'awards', 'languages', 'interests', 'references', 'volunteer', 'basics'];

    // 1. Detect Slots (Sidebar vs Main)
    const slots: { type: 'sidebar' | 'main', start: number, end: number }[] = [];

    // Check for explicit Handlebars slots OR Comment Markers
    const slotPatterns = [
        { type: 'sidebar', regex: /{{#sidebar}}([\s\S]*?){{\/sidebar}}/g },
        { type: 'main', regex: /{{#main}}([\s\S]*?){{\/main}}/g },
        { type: 'sidebar', regex: /<!--\s*SLOT-START:\s*SIDEBAR\s*-->([\s\S]*?)<!--\s*SLOT-END:\s*SIDEBAR\s*-->/g },
        { type: 'main', regex: /<!--\s*SLOT-START:\s*MAIN\s*-->([\s\S]*?)<!--\s*SLOT-END:\s*MAIN\s*-->/g }
    ];

    slotPatterns.forEach(pattern => {
        let match;
        // Reset regex state just in case
        pattern.regex.lastIndex = 0;
        while ((match = pattern.regex.exec(html)) !== null) {
            slots.push({ type: pattern.type as any, start: match.index, end: match.index + match[0].length });
        }
    });

    // Track which sections we found in HTML
    const foundSections = new Set<string>();

    // Parse sections found in HTML
    standardSections.forEach(sectionName => {
        // Find Mustache block only - no container detection
        const mustacheRegex = new RegExp(`{{#${sectionName}}}([\\s\\S]*?){{\\/${sectionName}}}`, 'g');
        let match;

        while ((match = mustacheRegex.exec(html)) !== null) {
            // Use Mustache block bounds directly (SAFE)
            const startIndex = match.index;
            const endIndex = match.index + match[0].length;

            // Determine Slot
            let slot: 'sidebar' | 'main' | undefined = undefined;
            for (const s of slots) {
                if (startIndex >= s.start && endIndex <= s.end) {
                    slot = s.type;
                    break;
                }
            }

            sections.push({
                id: `${sectionName}-${startIndex}`,
                name: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
                type: sectionName as any,
                containerStart: startIndex,
                containerEnd: endIndex,
                containerHtml: match[0],
                slot: slot // NEW PROPERTY
            });

            foundSections.add(sectionName);
        }
    });

    // Find Custom Sections block
    const customSectionRegex = /{{#customSections}}([\s\S]*?){{\/customSections}}/g;
    let match;
    while ((match = customSectionRegex.exec(html)) !== null) {
        const startIndex = match.index;
        const endIndex = match.index + match[0].length;

        let slot: 'sidebar' | 'main' | undefined = undefined;
        for (const s of slots) {
            if (startIndex >= s.start && endIndex <= s.end) {
                slot = s.type;
                break;
            }
        }

        sections.push({
            id: `customSections-${match.index}`,
            name: 'Custom Sections',
            type: 'custom',
            containerStart: startIndex,
            containerEnd: endIndex,
            containerHtml: match[0],
            slot: slot
        });
        foundSections.add('customSections');
    }

    // ADD MISSING SECTIONS FROM FORM SCHEMA
    // This ensures ALL sections appear in the layout menu, even if they have no content
    if (formSchema && formSchema.sections) {
        formSchema.sections.forEach((sectionSchema: any) => {
            const sectionId = sectionSchema.id;
            if (!foundSections.has(sectionId)) {
                // This section exists in the schema but not in HTML
                // Add it as a placeholder so it appears in the layout menu
                sections.push({
                    id: `${sectionId}-placeholder`,
                    name: sectionSchema.title || (sectionId.charAt(0).toUpperCase() + sectionId.slice(1)),
                    type: sectionId as any,
                    containerStart: -1, // Marker for "not in HTML yet"
                    containerEnd: -1,
                    containerHtml: '',
                    slot: sectionSchema.slot || 'main' // Default to main if not specified
                });
                foundSections.add(sectionId);
            }
        });
    }

    // ADD CUSTOM SECTIONS FROM RESUME DATA
    if (resumeData && resumeData.customSections && resumeData.customSections.length > 0) {
        if (!foundSections.has('customSections')) {
            // Custom sections exist in data but not in HTML template yet
            sections.push({
                id: 'customSections-data',
                name: 'Custom Sections',
                type: 'custom',
                containerStart: -1,
                containerEnd: -1,
                containerHtml: '',
                slot: 'main'
            });
        }
    }

    // POST-PROCESSING: Container Expansion (only for sections actually in HTML)
    return sections.map(section => {
        if (section.containerStart === -1) {
            // This is a placeholder section, don't try to expand
            return section;
        }

        const expanded = expandToContainer(html, section.containerStart, section.containerEnd);
        if (expanded) {
            return {
                ...section,
                containerStart: expanded.start,
                containerEnd: expanded.end,
                containerHtml: html.substring(expanded.start, expanded.end)
            };
        }
        return section;
    }).sort((a, b) => {
        // Sort: real sections first (by position), then placeholders at end
        if (a.containerStart === -1 && b.containerStart === -1) return 0;
        if (a.containerStart === -1) return 1;
        if (b.containerStart === -1) return -1;
        return a.containerStart - b.containerStart;
    });
}

/**
 * Heuristic to find the HTML container wrapping a mustache block.
 * Walks backwards to find an opening <div/section> and forwards to find matching close.
 */
function expandToContainer(html: string, start: number, end: number): { start: number, end: number } | null {
    // 1. Scan backwards from 'start' skipping whitespace/comments
    // We look for the nearest Opening Tag that is NOT self-closing and NOT detected as a sibling.

    // Simplistic Balanced Tag Seeker walking BACKWARDS from 'start'
    let balance = 0;
    let scanIdx = start;
    let parentStart = -1;
    let parentTagName = '';

    // Safety limit to prevent scanning entire file
    const SCAN_LIMIT = 1000;
    let scanned = 0;

    // We step backwards char by char?? No, identifying tags is hard reverse.
    // Better: extract the substring from (some reasonable lookback) to start.
    // But we need to handle proper nesting.

    // ALTERNATIVE: Use a stack-based tokenizer for the whole file? Too heavy.

    // HEURISTIC: most sections are <div class="..."> [Header] {{#loop}}...{{/loop}} </div>
    // Let's look for the LAST opening tag before 'start' that hasn't been closed.

    // We can't easily parse partial HTML backwards.
    // Let's assume standard formatting:
    // <div ...>
    //    <h3>...</h3>
    //    {{#block}}

    // Let's try to find an opening <div, <section, <article tag before 'start'.
    while (scanIdx > 0 && scanned < SCAN_LIMIT) {
        scanIdx--;
        scanned++;

        if (html[scanIdx] === '<' && html[scanIdx + 1] !== '/') {
            // Found potential opening tag
            // Check if it's a structural tag
            const tagMatch = html.substring(scanIdx, Math.min(scanIdx + 50, html.length)).match(/^<([a-z0-9]+)[^>]*>/i);
            if (tagMatch) {
                const tagName = tagMatch[1].toLowerCase();
                if (['div', 'section', 'article', 'aside'].includes(tagName)) {
                    // Check if this tag is CLOSED before our block starts?
                    // We need to check the substring between TagStart and BlockStart.
                    const interim = html.substring(scanIdx + tagMatch[0].length, start);

                    // Simple check: does interim contain the same number of open/close tags of this type?
                    // This is getting parsing-heavy.

                    // Let's try a simpler regex check on 'interim'.
                    // If 'interim' balance is 0, then THIS tag wraps our block.
                    if (isBalanced(interim)) {
                        parentStart = scanIdx;
                        parentTagName = tagName;
                        break; // Found it
                    }
                }
            }
        }
    }

    if (parentStart === -1) return null;

    // 2. Find matching closing tag after 'end'
    // We start at 'end' and look for </tagName> ensuring balance.
    let searchIdx = end;
    let closeBalance = 1; // We start needing 1 close
    scanned = 0;

    while (searchIdx < html.length && scanned < SCAN_LIMIT) {
        const nextOpen = html.indexOf(`<${parentTagName}`, searchIdx);
        const nextClose = html.indexOf(`</${parentTagName}>`, searchIdx);

        if (nextClose === -1) return null; // Broken HTML

        if (nextOpen !== -1 && nextOpen < nextClose) {
            // Found a nested open before the close
            closeBalance++;
            searchIdx = nextOpen + 1;
        } else {
            // Found a close
            closeBalance--;
            searchIdx = nextClose + 1;

            if (closeBalance === 0) {
                return { start: parentStart, end: nextClose + parentTagName.length + 3 };
            }
        }
        scanned += (nextClose - searchIdx); // approx progress
    }

    return null;
}

function isBalanced(htmlFragment: string): boolean {
    // Counts div/section/article tags. Primitive check.
    // Note: This ignores self-closing or void tags, which main layout tags usually aren't.
    // We just count <div and </div.
    const tags = ['div', 'section', 'article', 'aside'];
    let balance = 0;

    // Regex global match
    const openRegex = new RegExp(`<(${tags.join('|')})\\b[^>]*>`, 'gi');
    const closeRegex = new RegExp(`<\\/(${tags.join('|')})>`, 'gi');

    const opens = (htmlFragment.match(openRegex) || []).length;
    const closes = (htmlFragment.match(closeRegex) || []).length;

    return opens === closes;
}

/**
 * DISABLED: Reordering sections is currently not safe.
 * Moving Mustache blocks without their HTML containers breaks templates.
 * 
 * TODO: Implement proper HTML-aware parsing that can:
 * 1. Identify the full HTML container (header + wrapper + Mustache block)
 * 2. Safely move the entire container as a unit
 */
export function reorderSections(html: string, originalSections: TemplateSection[], newOrderIds: string[]): string {
    // 1. Sort originalSections by position to ensure we process them in document order
    // This allows us to find "gaps" (static content between sections) and preserve them.
    const sortedSections = [...originalSections].sort((a, b) => a.containerStart - b.containerStart);

    // 2. Identify "static" segments (content before, between, and after sections)
    // We treat the file as a sequence of: [Static0] [SectionA] [Static1] [SectionB] [Static2] ...
    // When reordering, we keep the Static blocks in place and just swap the [SectionX] blocks into the slots.
    // NOTE: This assumes sections are swappable into each other's slots, which is generally true for CV sections.

    // Ideally, we would reconstruct the whole file, but we need to know where the new sections GO.
    // A simpler approach for "reordering" items in a list is:
    // - Extract all section contents.
    // - Re-assemble the list of sections in the NEW order.
    // - Place them back into the original "slots" available.

    // HOWEVER, sections might have different wrapper HTML around them?
    // Our 'containerHtml' includes the mustache block.
    // If we just swap the mustache blocks, it should be fine for most templates.

    // Strategy:
    // 1. Create a map of ID -> HTML content for all sections.
    // 2. Determine the "slots" where sections currently reside (start/end indices).
    // 3. Iterate through the sorted slots. Into the first slot, put the content of the section that is now first in 'newOrderIds'.
    // 4. Reconstruct the string.

    if (originalSections.length === 0 || newOrderIds.length === 0) return html;

    const sectionsById = new Map<string, string>();
    originalSections.forEach(s => sectionsById.set(s.id, s.containerHtml));

    // We only want to reorder the sections that are actually IN the newOrderIds list.
    // (There might be invisible sections we shouldn't touch, though typically we pass all).
    // Actually, we must be careful: if we have Sidebar vs Main, we can only reorder within the same "group" usually.
    // But the UI currently passes ALL sections in newOrderIds if it's a flat list, OR separate lists.
    // The current UI implementation calls reorder with a merged list of IDs.

    let currentHtml = html;
    let result = '';
    let lastUnchangedIndex = 0;

    // We proceed slot by slot.
    // But wait, if sections are of different sizes or have different surrounding text, just swapping content might break if we rely on precise 'gaps'.
    // SAFEST APPROACH:
    // We assume the sections appear in the file in the order of 'sortedSections'.
    // We will replace the content at 'sortedSections[i]' with the content of the section that SHOULD be at position i.

    // Filter sortedSections to only those involved in the reorder (present in newOrderIds) - mostly all.
    const activeSections = sortedSections.filter(s => newOrderIds.includes(s.id));

    // Map the new order to the *content* we want to place.
    // logicalStep[i] = ID of the section that should be in the i-th physical slot.
    // But we need to handle the case where we moved a Sidebar item to Main or vice versa?
    // If we allow moving across slots, we just effectively "move" the mustache block.
    // The parser creates slots based on *content* matching.
    // If we move {{#skills}}...{{/skills}} from Sidebar to Main, it just moves the text.
    // The surrounding <!-- SLOT --> comments remain.
    // So YES, we can just stitch the string.

    for (let i = 0; i < activeSections.length; i++) {
        const slot = activeSections[i];

        // Append everything before this slot (static headers, gaps, other slots we skipped)
        result += html.substring(lastUnchangedIndex, slot.containerStart);

        // Find which section ID should go into this i-th slot
        // newOrderIds is the desired sequence.
        // We need to find the ID corresponding to this *relative* position among the active sections.
        // Wait, newOrderIds might contain ALL IDs. 
        // We need to find the i-th ID *that is present in activeSections*.
        // (This handles the case where newOrderIds might miss some hidden sections).

        // Let's assume newOrderIds is the master list for these active sections.
        // We need the i-th ID from newOrderIds?
        // Yes, if newOrderIds represents the sequence of *these* blocks.

        // CAUTION: If newOrderIds includes Sidebar AND Main items mixed, and we mistakenly put a Main item
        // into a Sidebar slot physically, it depends on the template if that works.
        // For our AI templates, Sidebar/Main are just DIV wrappers. So yes, it works!

        const targetId = newOrderIds[i]; // The ID that should be here
        const content = sectionsById.get(targetId);

        if (content) {
            result += content;
        } else {
            // Should not happen, fallback to original
            result += slot.containerHtml;
        }

        lastUnchangedIndex = slot.containerEnd;
    }

    // Append remaining file footer
    result += html.substring(lastUnchangedIndex);

    return result;
}

/**
 * Helper to delete a section safely.
 */
export function deleteSection(html: string, section: TemplateSection): string {
    // Simple string removal
    return html.substring(0, section.containerStart) + html.substring(section.containerEnd);
}

// Deprecated or unused placeholders
export function swapSections(html: string, section1: TemplateSection, section2: TemplateSection): string {
    return reorderSections(html, [section1, section2], [section2.id, section1.id]);
}

export function renameSection(html: string, section: TemplateSection, newName: string): string {
    // Renaming is actually just changing the display name, which isn't stored in HTML unless we parse headers.
    // For now, we assume we can't easily rename the *TYPE* (mustache key) without breaking data binding.
    // If we mean renaming the visible "Header", that's different.
    // Current parser calculates 'name' from mustache key.
    return html;
}


