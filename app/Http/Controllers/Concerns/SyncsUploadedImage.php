<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

trait SyncsUploadedImage
{
    /**
     * Guarda la imagen nueva del campo `$input` (borrando la anterior) o la
     * quita si llegó marcado `remove_$input`. Sin ninguno de los dos, no cambia nada.
     */
    protected function syncImage(Request $request, Model $model, string $column, string $input, string $directory): void
    {
        $previous = $model->getAttribute($column);

        if ($request->hasFile($input)) {
            $model->update([$column => $request->file($input)->store($directory, 'public')]);
        } elseif ($request->boolean('remove_'.$input)) {
            $model->update([$column => null]);
        } else {
            return;
        }

        if ($previous) {
            Storage::disk('public')->delete($previous);
        }
    }
}
