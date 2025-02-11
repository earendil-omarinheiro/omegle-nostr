import { Injectable } from '@angular/core';
import { NostrEventKind } from '@domain/nostr-event-kind.enum';
import { NostrUser } from '@domain/nostr-user';
import { Event, UnsignedEvent, getEventHash, getSignature, nip04 } from 'nostr-tools';

@Injectable({
  providedIn: 'root'
})
export class NostrEventFactory {

  /**
   * default expiration time in seconds
   */
  private readonly DEFAULT_EXPIRATION_TIME = 60;

  private getCurrentTimestamp(): number {
    const oneMillisecond = 1000;
    return Math.floor(Date.now() / oneMillisecond);
  }

  /**
   * @param expireIn time in seconds to expire, default to 60
   * @returns expiration timestamp
   */
  private getExpirationTimestamp(expireIn = this.DEFAULT_EXPIRATION_TIME): string {
    const oneMillisecond = 1000;
    const expirationTimestamp = Math.floor(Date.now() / oneMillisecond) + expireIn;
    return String(expirationTimestamp);
  }

  /**
   * NIP 4
   * https://github.com/nostr-protocol/nips/blob/master/04.md
   * https://github.com/nbd-wtf/nostr-tools/blob/master/nip04.test.ts
   */
  async createEncryptedDirectMessage(you: Required<NostrUser>, stranger: NostrUser, message: string): Promise<Event<NostrEventKind.EncryptedDirectMessage>> {
    const encriptedMessage = await nip04.encrypt(you.nostrSecret, stranger.nostrPublic, message);

    // FIXME: preciso descobrir como inserir o iv aqui
    const unsignedEvent: UnsignedEvent = {
      kind: NostrEventKind.EncryptedDirectMessage,
      content: encriptedMessage, // + '?iv=' + ivBase64,
      pubkey: you.publicKeyHex,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_at: this.getCurrentTimestamp(),
      tags: [
        ['p', stranger.publicKeyHex]
      ]
    };

    const id = getEventHash(unsignedEvent);
    const sig = getSignature(unsignedEvent, you.privateKeyHex);

    return Promise.resolve({ id, sig, ...unsignedEvent });
  }

  /**
   * NIP 38
   * https://github.com/nostr-protocol/nips/blob/master/38.md
   */
  createWannaChatUserStatus(user: Required<NostrUser>): Event<NostrEventKind.UserStatuses> {
    const unsignedEvent: UnsignedEvent = {
      kind: NostrEventKind.UserStatuses,
      content: "#wannachat",
      pubkey: user.publicKeyHex,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_at: this.getCurrentTimestamp(),
      tags: [
        ['d', 'general'],
        ['expiration', this.getExpirationTimestamp()],
        ['t', 'wannachat']
      ]
    };

    const id = getEventHash(unsignedEvent);
    const sig = getSignature(unsignedEvent, user.privateKeyHex);

    return { id, sig, ...unsignedEvent };
  }

  createDisconnectedUserStatus(user: Required<NostrUser>): Event<NostrEventKind.UserStatuses> {
    return this.createUserStatus(user, 'disconnected');
  }

  createTypingUserStatus(user: Required<NostrUser>): Event<NostrEventKind.UserStatuses> {
    return this.createUserStatus(user, 'typing');
  }

  createChatingUserStatus(you: Required<NostrUser>, strange: NostrUser): Event<NostrEventKind.UserStatuses> {
    return this.createUserStatus(you, 'chating', [ 'p', strange.publicKeyHex ]);
  }

  cleanUserStatus(user: Required<NostrUser>): Event<NostrEventKind.UserStatuses> {
    return this.createUserStatus(user, '');
  }

  private createUserStatus(user: Required<NostrUser>, status: string, tag?: string[]): Event<NostrEventKind.UserStatuses> {
    const tags = [
      ['d', 'general']
    ];

    if (tag) {
      tags.push(tag);
    }

    const unsignedEvent: UnsignedEvent = {
      kind: NostrEventKind.UserStatuses,
      content: status,
      pubkey: user.publicKeyHex,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      created_at: this.getCurrentTimestamp(),
      tags
    };

    const id = getEventHash(unsignedEvent);
    const sig = getSignature(unsignedEvent, user.privateKeyHex);

    return { id, sig, ...unsignedEvent };
  }
}
