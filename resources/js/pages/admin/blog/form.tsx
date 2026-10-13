import { Form, Head, Link } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import RichTextEditor from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { image, index, store, update } from '@/routes/admin/posts';

type Post = {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    cover_url: string | null;
    is_published: boolean;
};

const textareaClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function PostForm({ post }: { post: Post | null }) {
    const title = post ? 'Editar publicación' : 'Nueva publicación';

    return (
        <>
            <Head title={title} />

            <div className="max-w-3xl space-y-6 p-4">
                <Heading
                    title={title}
                    description={
                        post
                            ? `Dirección: /blog/${post.slug}`
                            : 'La dirección de la publicación se genera a partir del título.'
                    }
                />

                <Form
                    {...(post ? update.form(post.id) : store.form())}
                    className="space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Título</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    required
                                    maxLength={160}
                                    defaultValue={post?.title}
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="excerpt">
                                    Resumen (opcional)
                                </Label>
                                <textarea
                                    id="excerpt"
                                    name="excerpt"
                                    rows={2}
                                    maxLength={300}
                                    defaultValue={post?.excerpt}
                                    className={textareaClass}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Aparece en las tarjetas del blog y en
                                    buscadores. Si lo dejas vacío se toma el
                                    inicio del texto.
                                </p>
                                <InputError message={errors.excerpt} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cover">Imagen de portada</Label>
                                <div className="flex items-center gap-3">
                                    {post?.cover_url && (
                                        <img
                                            src={post.cover_url}
                                            alt=""
                                            className="h-14 w-20 shrink-0 rounded-lg border object-cover"
                                        />
                                    )}
                                    <Input
                                        id="cover"
                                        name="cover"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    PNG, JPG o WebP de hasta 4 MB. Se ve mejor
                                    en formato horizontal.
                                </p>
                                <InputError message={errors.cover} />

                                {post?.cover_url && (
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            name="remove_cover"
                                            value="1"
                                            className="size-4"
                                        />
                                        Quitar la portada actual
                                    </label>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="body">Contenido</Label>
                                <RichTextEditor
                                    id="body"
                                    name="body"
                                    uploadUrl={image.url()}
                                    defaultValue={post?.body}
                                />
                                <InputError message={errors.body} />
                            </div>

                            <label className="flex items-start gap-3 rounded-xl border p-4">
                                <input
                                    type="checkbox"
                                    name="published"
                                    value="1"
                                    defaultChecked={post?.is_published ?? false}
                                    className="mt-1 size-4"
                                />
                                <span>
                                    <span className="block font-medium">
                                        Publicada
                                    </span>
                                    <span className="block text-sm text-muted-foreground">
                                        Sin marcar queda como borrador: no
                                        aparece en el sitio y solo tú puedes
                                        abrirla.
                                    </span>
                                </span>
                            </label>

                            <div className="flex gap-2">
                                <Button disabled={processing}>Guardar</Button>
                                <Button variant="ghost" asChild>
                                    <Link href={index()}>Cancelar</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

PostForm.layout = {
    breadcrumbs: [
        {
            title: 'Blog',
            href: index(),
        },
    ],
};
