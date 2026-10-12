"use client";

import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "isomorphic-dompurify";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Eraser,
  Eye,
  FileCode,
  FileText,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Loader2,
  MailMinus,
  Palette,
  Save,
  Smile,
  Sparkles,
  Strikethrough,
  Type as TypeIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/ui/dropdown-menu";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/ui/popover";
import { Separator } from "@/components/shadcn/ui/separator";
import { Textarea } from "@/components/shadcn/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn/ui/tooltip";

interface ContactPreview {
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  location: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  timezone: string | null;
  research_report: string | null;
  email_1_subject: string;
  email_1_body: string;
  email_2_subject: string | null;
  email_2_body: string;
  email_3_subject: string;
  email_3_body: string;
}

interface SequenceStep {
  stepNumber: number;
  subject: string;
  body: string;
  delayDays: number;
}

interface VariableOption {
  label: string;
  value: string;
}

interface VariableGroup {
  label: string;
  items: VariableOption[];
}

export interface EmailEditorProps {
  step: SequenceStep;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  /** Optional grouped variable list. Defaults to lead variables only. */
  variableGroups?: VariableGroup[];
  /** Contact whose real values feed the Preview dialog substitution. */
  previewContact?: ContactPreview;
}

const DEFAULT_LEAD_VARIABLES = [
  { label: "First Name", value: "{{first_name}}" },
  { label: "Last Name", value: "{{last_name}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Company", value: "{{company}}" },
  { label: "Job Title", value: "{{job_title}}" },
  { label: "Phone", value: "{{phone}}" },
  { label: "Location", value: "{{location}}" },
  { label: "Website URL", value: "{{website_url}}" },
  { label: "LinkedIn URL", value: "{{linkedin_url}}" },
  { label: "Timezone", value: "{{timezone}}" },
  { label: "Research Report", value: "{{research_report}}" },
  { label: "Unsubscribe URL", value: "{{unsubscribe_url}}" },
];

/**
 * Clean malformed AI-generated anchor markup. Mirror of cleanAnchors() in
 * lib/outreach/sending/template.ts — same regex, same behaviour, so the
 * Preview agrees with what actually gets sent.
 */
function cleanAnchors(html: string): string {
  if (!html) return html;
  const splitRegex = /(<a\b[^>]*>)([\s\S]*?)(<br\s*\/?>)([\s\S]*?)(<\/a>)/gi;
  let prev: string;
  let cur = html;
  do {
    prev = cur;
    cur = cur.replace(
      splitRegex,
      (_, open, before, br, after, close) => `${open}${before}${close}${br}${after}`,
    );
  } while (cur !== prev);

  cur = cur.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (match, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    if (!text || /^[—–\-\u2026\s.,;:!?•·]+$/.test(text)) return inner;
    return match;
  });

  return cur;
}

function renderPreviewTokens(input: string, contact: ContactPreview | undefined): string {
  if (!contact) return input;
  const samples: Record<string, string> = {
    first_name: contact.first_name ?? "",
    last_name: contact.last_name ?? "",
    email: contact.email,
    company: contact.company ?? "",
    job_title: contact.job_title ?? "",
    phone: contact.phone ?? "",
    location: contact.location ?? "",
    website_url: contact.website_url ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    timezone: contact.timezone ?? "",
    research_report: contact.research_report ?? "",
    unsubscribe_url: "https://__YOUR_DOMAIN__/unsubscribe/preview",
    email_1_body: contact.email_1_body ?? "",
    email_2_body: contact.email_2_body ?? "",
    email_3_body: contact.email_3_body ?? "",
    email_1_subject: contact.email_1_subject ?? "",
    email_2_subject: contact.email_2_subject ?? "",
    email_3_subject: contact.email_3_subject ?? "",
    signature: '<p>—<br>Jake Schepis<br><a href="https://__YOUR_DOMAIN__">__YOUR_DOMAIN__</a></p>',
    unsubscribe_link:
      '<p style="font-size:12px;color:#888;margin-top:24px;">To unsubscribe, <a href="https://__YOUR_DOMAIN__/unsubscribe/preview">click here</a>.</p>',
    email_body: contact.email_1_body ?? "",
    email_subject: contact.email_1_subject ?? "",
  };
  const blockTokens = new Set([
    "email_body",
    "email_1_body",
    "email_2_body",
    "email_3_body",
    "signature",
    "unsubscribe_link",
  ]);
  const blockWrapRe =
    /<p\b[^>]*>\s*\{\{(email_body|email_[123]_body|signature|unsubscribe_link)\}\}\s*<\/p>/g;
  let substituted = input.replace(blockWrapRe, (match, key: string) =>
    blockTokens.has(key) && key in samples ? samples[key] : match,
  );
  substituted = substituted.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in samples ? samples[key] : match,
  );
  substituted = substituted.replace(/<p\b[^>]*>\s*(?:<br\s*\/?>|&nbsp;|\s)*\s*<\/p>/gi, "");
  return cleanAnchors(substituted);
}

export function EmailEditor({
  step,
  onSubjectChange,
  onBodyChange,
  onSave,
  isSaving,
  variableGroups,
  previewContact,
}: EmailEditorProps) {
  const allVariables = (
    variableGroups ?? [{ label: "Lead", items: DEFAULT_LEAD_VARIABLES }]
  ).flatMap((group) => group.items);
  const editorVariableGroups = variableGroups ?? [{ label: "Lead", items: DEFAULT_LEAD_VARIABLES }];
  const [subject, setSubject] = useState(step.subject);
  const [showCodeView, setShowCodeView] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDisplayText, setLinkDisplayText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [variablesPopupOpen, setVariablesPopupOpen] = useState(false);
  const [variablesPopupPosition, setVariablesPopupPosition] = useState({ x: 0, y: 0 });
  const [variablesSelectedIndex, setVariablesSelectedIndex] = useState(0);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Write your email content here...",
      }),
      TiptapImage,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: step.body || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onBodyChange(editor.getHTML());

      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 2), from, "");
      if (textBefore === "{{" && editorContainerRef.current) {
        const coords = editor.view.coordsAtPos(from);
        const containerRect = editorContainerRef.current.getBoundingClientRect();
        setVariablesPopupPosition({
          x: coords.left - containerRect.left,
          y: coords.bottom - containerRect.top + 8,
        });
        setVariablesSelectedIndex(0);
        setVariablesPopupOpen(true);
      }
    },
  });

  const insertVariable = useCallback(
    (variable: string) => {
      if (editor) {
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 2), from, "");
        if (textBefore === "{{") {
          editor
            .chain()
            .focus()
            .deleteRange({ from: from - 2, to: from })
            .insertContent(variable)
            .run();
        } else {
          editor.chain().focus().insertContent(variable).run();
        }
        setVariablesPopupOpen(false);
      }
    },
    [editor],
  );

  useEffect(() => {
    if (!variablesPopupOpen || !editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setVariablesSelectedIndex((prev) => (prev < allVariables.length - 1 ? prev + 1 : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setVariablesSelectedIndex((prev) => (prev > 0 ? prev - 1 : allVariables.length - 1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        const selectedVariable = allVariables[variablesSelectedIndex];
        if (selectedVariable) insertVariable(selectedVariable.value);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setVariablesPopupOpen(false);
        editor.commands.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [
    variablesPopupOpen,
    variablesSelectedIndex,
    editor,
    allVariables.length,
    allVariables,
    insertVariable,
  ]);

  useEffect(() => {
    if (editor && step.body !== editor.getHTML()) {
      editor.commands.setContent(step.body || "");
    }
    setSubject(step.subject);
  }, [step.body, step.subject, editor]);

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    onSubjectChange(value);
  };

  const showVariablesAtCursor = () => {
    if (!editor || !editorContainerRef.current) return;

    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    const containerRect = editorContainerRef.current.getBoundingClientRect();

    setVariablesPopupPosition({
      x: coords.left - containerRect.left,
      y: coords.bottom - containerRect.top + 8,
    });
    setVariablesPopupOpen(true);
  };

  const insertVariableToSubject = (variable: string) => {
    const newSubject = subject + variable;
    setSubject(newSubject);
    onSubjectChange(newSubject);
  };

  const handleInsertLink = () => {
    if (editor && linkUrl) {
      if (linkDisplayText) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkDisplayText}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setLinkDialogOpen(false);
      setLinkDisplayText("");
      setLinkUrl("");
    }
  };

  const insertUnsubscribeLink = () => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertContent(
          'If you\'d prefer not to receive these emails, <a href="{{unsubscribe_url}}">unsubscribe here</a>.',
        )
        .run();
    }
  };

  const cleanHtml = () => {
    if (editor) {
      const text = editor.getText();
      editor.commands.setContent(`<p>${text}</p>`);
    }
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground shrink-0">Subject</span>
          <Input
            value={subject}
            onChange={(event) => handleSubjectChange(event.target.value)}
            placeholder="Enter email subject..."
            className="flex-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="shrink-0">
                <Code className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {editorVariableGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {groupIndex > 0 && <DropdownMenuSeparator />}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {group.label}
                  </div>
                  {group.items.map((variable) => (
                    <DropdownMenuItem
                      key={variable.value}
                      onClick={() => insertVariableToSubject(variable.value)}
                    >
                      {variable.label}
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 shrink-0"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      <div className="px-4">
        <Separator />
      </div>

      <div ref={editorContainerRef} className="flex-1 p-4 overflow-y-auto min-h-0 relative">
        {showCodeView ? (
          <Textarea
            value={editor.getHTML()}
            onChange={(event) => editor.commands.setContent(event.target.value)}
            className="w-full h-full font-mono text-sm resize-none"
            placeholder="<p>HTML content...</p>"
          />
        ) : (
          <>
            <EditorContent
              editor={editor}
              className="prose prose-sm max-w-none min-h-[200px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]"
            />

            {variablesPopupOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close variables menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setVariablesPopupOpen(false)}
                />
                <div
                  className="absolute z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[180px]"
                  style={{
                    left: variablesPopupPosition.x,
                    top: variablesPopupPosition.y,
                  }}
                >
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b mb-1">
                    Insert Variable
                  </div>
                  {(() => {
                    let flatIndex = 0;
                    return editorVariableGroups.map((group, groupIndex) => (
                      <div key={group.label}>
                        {groupIndex > 0 && <div className="border-t my-1" />}
                        <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </div>
                        {group.items.map((variable) => {
                          const index = flatIndex++;
                          return (
                            <button
                              type="button"
                              key={variable.value}
                              className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                                index === variablesSelectedIndex
                                  ? "bg-accent text-accent-foreground"
                                  : "hover:bg-accent hover:text-accent-foreground"
                              }`}
                              onClick={() => insertVariable(variable.value)}
                              onMouseEnter={() => setVariablesSelectedIndex(index)}
                            >
                              {variable.label}
                            </button>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="px-4">
        <Separator />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="gap-2" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>

          <Button size="sm" variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Tools
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Templates
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Introduction</DropdownMenuItem>
              <DropdownMenuItem>Follow-up</DropdownMenuItem>
              <DropdownMenuItem>Re-engagement</DropdownMenuItem>
              <DropdownMenuItem>Meeting Request</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" variant="outline" className="gap-2" onClick={showVariablesAtCursor}>
            <Code className="h-4 w-4" />
            Variables
          </Button>

          <Button size="sm" variant="outline" className="gap-2" onClick={insertUnsubscribeLink}>
            <MailMinus className="h-4 w-4" />
            Unsubscribe
          </Button>

          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <TypeIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <TooltipContent>More Text</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold className="h-4 w-4 mr-2" /> Bold
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic className="h-4 w-4 mr-2" /> Italic
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon className="h-4 w-4 mr-2" /> Underline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleStrike().run()}>
                <Strikethrough className="h-4 w-4 mr-2" /> Strikethrough
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List className="h-4 w-4 mr-2" /> Bullet List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered className="h-4 w-4 mr-2" /> Numbered List
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("left").run()}>
                <AlignLeft className="h-4 w-4 mr-2" /> Align Left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("center").run()}>
                <AlignCenter className="h-4 w-4 mr-2" /> Align Center
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign("right").run()}>
                <AlignRight className="h-4 w-4 mr-2" /> Align Right
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().unsetAllMarks().run()}>
                <Eraser className="h-4 w-4 mr-2" /> Clear Formatting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <TooltipProvider>
              <Tooltip>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <TooltipContent>Text Color</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-5 gap-1">
                {[
                  "#000000",
                  "#374151",
                  "#DC2626",
                  "#EA580C",
                  "#CA8A04",
                  "#16A34A",
                  "#0891B2",
                  "#2563EB",
                  "#7C3AED",
                  "#DB2777",
                ].map((color) => (
                  <button
                    type="button"
                    key={color}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={cleanHtml}>
                  <Eraser className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clean HTML</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setLinkDialogOpen(true)}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert Link</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <TooltipContent>More Rich</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={insertUnsubscribeLink}>
                <MailMinus className="h-4 w-4 mr-2" /> Insert Unsubscribe Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const url = prompt("Enter image URL:");
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                }}
              >
                <ImageIcon className="h-4 w-4 mr-2" /> Insert Image
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const emoji = prompt("Enter emoji:");
                  if (emoji) editor.chain().focus().insertContent(emoji).run();
                }}
              >
                <Smile className="h-4 w-4 mr-2" /> Emoticons
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={showCodeView ? "secondary" : "outline"}
                  className="h-8 w-8 p-0"
                  onClick={() => setShowCodeView(!showCodeView)}
                >
                  <FileCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Code View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Subject: {renderPreviewTokens(subject, previewContact)}
              {previewContact ? (
                <span className="block text-[11px] mt-1">
                  Showing as it will render for <strong>{previewContact.email}</strong>
                </span>
              ) : (
                <span className="block text-[11px] mt-1 text-amber-600">
                  No leads in this campaign yet — showing tokens unresolved.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-md p-6 bg-white text-gray-900 text-sm">
            <div
              className="prose prose-sm max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurify-sanitized email HTML preview
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  renderPreviewTokens(editor?.getHTML() ?? "", previewContact),
                ),
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>Add a hyperlink to your email content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="display-text">Display Text (optional)</Label>
              <Input
                id="display-text"
                placeholder="Click here"
                value={linkDisplayText}
                onChange={(event) => setLinkDisplayText(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Web Address (URL)</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInsertLink} disabled={!linkUrl}>
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
