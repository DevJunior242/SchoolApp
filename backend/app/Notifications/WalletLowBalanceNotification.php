<?php

namespace App\Notifications;

use App\Models\StudentWallet;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WalletLowBalanceNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly StudentWallet $wallet) {}

    /**
     * Déclenchée une seule fois par "épisode" de solde bas (voir
     * `low_balance_notified`, remis à false à la prochaine recharge) :
     * pas de canal mail, la cloche suffit.
     */
    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $this->wallet->loadMissing('student');

        return [
            'title' => 'Solde cantine bas',
            'message' => sprintf(
                'Le solde cantine de %s est bas (%s), pensez à le recharger.',
                $this->wallet->student->fullname,
                number_format((float) $this->wallet->balance, 0, ',', ' '),
            ),
            'student_id' => $this->wallet->student_id,
            'url' => "/dashboard/students/{$this->wallet->student_id}/wallet",
        ];
    }
}
