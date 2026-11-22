<?php

namespace App\Concerns;

use App\Models\User;
use App\Support\PhoneNumber;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(string $role, ?int $userId = null): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
            'username' => $this->usernameRules($userId),
            'phone' => $this->phoneRules($role, $userId),
        ];
    }

    /**
     * WhatsApp opcional. Diez dígitos se toman como número de México; el número
     * se compara ya normalizado para que no se repita con otro formato. Solo no
     * puede repetirse dentro del mismo rol: un super admin y un administrador de
     * empresa sí pueden compartirlo.
     *
     * @return array<int, ValidationRule|Closure|array<mixed>|string>
     */
    protected function phoneRules(string $role, ?int $userId = null): array
    {
        return [
            'nullable',
            'string',
            'max:25',
            function (string $attribute, mixed $value, Closure $fail) use ($role, $userId) {
                $phone = PhoneNumber::normalize((string) $value);

                if ($phone === null) {
                    $fail('Escribe un número de WhatsApp válido, por ejemplo 55 1234 5678.');
                } elseif (User::query()->where('phone', $phone)->where('role', $role)->when($userId, fn ($query) => $query->whereKeyNot($userId))->exists()) {
                    $fail('Este número ya está registrado con otro usuario del mismo rol.');
                }
            },
        ];
    }

    /**
     * El alias es opcional; sin «@» para no confundirse con un correo al iniciar sesión.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function usernameRules(?int $userId = null): array
    {
        return [
            'nullable',
            'string',
            'min:3',
            'max:30',
            'regex:/^[a-z0-9._-]+$/i',
            $userId === null
                ? Rule::unique(User::class, 'username')
                : Rule::unique(User::class, 'username')->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}
