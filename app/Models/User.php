<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Support\PhoneNumber;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $username Alias para iniciar sesión sin escribir el correo.
 * @property string|null $phone WhatsApp en formato E.164 (+52…), para votar por WhatsApp.
 * @property UserRole $role
 * @property int|null $company_id
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'username', 'phone', 'password', 'role', 'company_id'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * El alias se guarda en minúsculas, igual que se busca al iniciar sesión.
     *
     * @return Attribute<string|null, string|null>
     */
    protected function username(): Attribute
    {
        return Attribute::set(fn (?string $value) => filled($value) ? mb_strtolower(trim($value)) : null);
    }

    /**
     * El teléfono se guarda normalizado para encontrar al remitente de un WhatsApp.
     *
     * @return Attribute<string|null, string|null>
     */
    protected function phone(): Attribute
    {
        return Attribute::set(fn (?string $value) => PhoneNumber::normalize($value));
    }

    /**
     * Usuario dueño del número que escribió por WhatsApp («whatsapp:+52…»).
     */
    public static function findByWhatsApp(string $from): ?self
    {
        $phone = PhoneNumber::normalize($from);

        return $phone ? static::query()->where('phone', $phone)->first() : null;
    }

    /**
     * Busca al usuario por correo si lo escrito lleva «@», o por alias si no.
     */
    public static function findForLogin(string $login): ?self
    {
        $login = mb_strtolower(trim($login));

        return static::query()->where(str_contains($login, '@') ? 'email' : 'username', $login)->first();
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin;
    }

    public function isDecider(): bool
    {
        return $this->role === UserRole::Decider;
    }

    /**
     * Solo vota quien administra una empresa asociada activa.
     */
    public function canVote(): bool
    {
        return $this->role === UserRole::CompanyAdmin && $this->company?->is_active === true;
    }
}
