package MT::Plugin::AIAssistant;

use strict;
use warnings;
use utf8;

use File::Basename qw(basename dirname);
use HTTP::Request;

our $GPT_3_5_TURBO_INPUT_TOKENS     = 1000;
our $GPT_3_5_TURBO_16K_INPUT_TOKENS = 4000;

sub component {
    __PACKAGE__ =~ m/::([^:]+)\z/;
}

sub plugin {
    MT->component( component() );
}

sub insert_after {
    my ( $tmpl, $id, $tokens ) = @_;

    my $before = $id ? $tmpl->getElementById($id) : undef;
    if ( $id && !$before ) {
        $before = $tmpl->getElementsByName($id)->[0];
    }

    if ( !ref $tokens ) {
        $tokens = plugin()->load_tmpl($tokens)->tokens;
    }

    foreach my $t (@$tokens) {
        $tmpl->insertAfter( $t, $before );
        $before = $t;
    }
}

sub api_key {
    plugin()->get_config_value('ai_assistant_api_key');
}

sub max_input_tokens {
    plugin()->get_config_value('ai_assistant_allow_16k')
        ? $GPT_3_5_TURBO_16K_INPUT_TOKENS
        : $GPT_3_5_TURBO_INPUT_TOKENS;
}

sub template_param_edit_entry {
    my ( $cb, $app, $param, $tmpl ) = @_;

    return unless api_key();

    my $static_path = do {
        my $plugin      = plugin();
        my $static      = $app->static_path;
        my $plugin_name = basename( $plugin->{full_path} );
        my $dir         = basename( dirname( $plugin->{full_path} ) );
        "$static$dir/$plugin_name";
    };
    my $version = plugin()->version;

    my $data_label_field;
    if ( my $ct_id = $app->param('content_type_id') ) {
        my $ct = $app->model('content_type')->load($ct_id)
            or return;
        $data_label_field = $ct->data_label && MT->model('content_field')->load(
            {   content_type_id => $ct->id,
                unique_id       => $ct->data_label,
            }
        );
    }

    insert_after( $tmpl, 'edit_screen', 'edit_entry.tmpl' );
    insert_after(
        $tmpl,
        'edit_screen',
        [   $tmpl->createElement(
                'var',
                {   name  => 'plugin_ai_assistant_static_path',
                    value => $static_path,
                }
            ),
            $tmpl->createElement(
                'var',
                {   name  => 'plugin_ai_assistant_version',
                    value => $version,
                }
            ),
            $tmpl->createElement(
                'var',
                {   name  => 'plugin_ai_assistant_max_input_tokens',
                    value => max_input_tokens(),
                }
            ),
            (   $data_label_field
                ? ( $tmpl->createElement(
                        'var',
                        {   name  => 'plugin_ai_assistant_data_label_field_name',
                            value => 'content-field-' . $data_label_field->id,
                        }
                    )
                    )
                : ()
            ),
        ]
    );
}

sub template_param_ai_assistant_system_config {
    my ( $cb, $app, $tmpl ) = @_;

    return unless api_key();

    my $tail = substr( api_key(), -4 );
    if ($tail =~ m/\A[0-9A-Fa-z]+\z/) {
        $$tmpl =~ s{\A}{<mt:SetVarBlock name="masked_ai_assistant_api_key">********$tail</mt:SetVarBlock>};
    }
}

sub save_config_filter {
    my ( $cb, $plugin, $data, $scope ) = @_;

    return 1 unless $scope eq 'system';

    if ( !defined( $data->{ai_assistant_api_key} ) ) {
        $data->{ai_assistant_api_key} = api_key();    # keep the current value
    }

    1;
}

sub generate_title {
    my ($app) = @_;

    my $output_format = <<PROMPT;
3. Output the generated title as a JSON list like ["title1", "title2", ...].
PROMPT

    my %flavors = (
        attractive => [
            {   role    => "system",
                content => <<CONTENT,
I want you to act as a title generator. A user will provide you with the first part of an article and you will generate five titles in the following steps.

1. read the article and think its strengths. You don't have to output your thought.
2. generate 5 attention-grabbing titles in Japanese based on your thought. Keep in mind that they are well maintained within 40 characters.
$output_format
CONTENT
            },
        ],
        socratic => [
            {   role    => "system",
                content => <<CONTENT,
I want you to act as a Socrat. A user will provide you with the first part of an article and you will generate five questions in the following steps.

1. read the article and think with the Socratic method of questioning to explore topics such as justice, virtue, beauty, courage and other ethical issues to engage in philosophical discussions. You don't have to output your thought.
2. generate 5 questions in Japanese based on your thought. Keep in mind that they are well maintained within 40 characters.
$output_format
CONTENT
            },
        ],
        model => [
            {   role    => "system",
                content => <<CONTENT,
I want you to act as an instructor, teaching how to write for beginners. A user will provide you with the first part of an article and you will generate five titles in the following steps.

1. read the article and think its strengths. You don't have to output your thought.
2. generate 5 plain titles in Japanese based on your thought. Keep in mind that they are plain and simple within 40 characters. You must not use any symbols such as "!", "?".
$output_format
CONTENT
            },
        ],
        scientific => [
            {   role    => "system",
                content => <<CONTENT,
I want you to act as a journal reviewer. A user will provide you with the first part of an article and you will generate five titles in the following steps.

1. read the article and think the constructive criticism on its strengths and weaknesses. You don't have to output your thought.
2. generate 5 academic titles in Japanese based on your thought. Keep in mind that they are academic, well descriptive and verbose within 100 characters.
$output_format
CONTENT
            },
        ],
        dreamy => [
            {   role    => "system",
                content => <<CONTENT,
I want you to act as a dream interpreter. A user will provide you with the first part of an article and you will generate five titles in the following steps.

1. read the article and think its ideal situation. You don't have to output your thought.
2. generate 5 dreamy titles in Japanese based on your thought. Keep in mind that they give positive feelings within 40 characters.
$output_format
CONTENT
            },
        ],
    );
    my $messages = $flavors{ $app->param('flavor') } || $flavors{attractive};
    my $content  = substr( scalar $app->param('content'), 0, max_input_tokens() );
    push @$messages,
        {
        role    => "user",
        content => 'ARTICLE: ' . $content,
        };

    my $api_key = api_key();

    my $ua  = MT->new_ua( { timeout => 60 } );
    my $req = HTTP::Request->new(
        'POST',
        'https://api.openai.com/v1/chat/completions',
        [   'Content-Type'  => 'application/json',
            'Authorization' => "Bearer $api_key",
        ],
        Encode::encode(
            'UTF-8',
            MT::Util::to_json(
                {   model => length($content) > $GPT_3_5_TURBO_INPUT_TOKENS
                    ? 'gpt-3.5-turbo-16k'
                    : 'gpt-3.5-turbo',
                    messages    => $messages,
                    temperature => 0.6,
                    max_tokens  => 2046,
                }
            )
        )
    );

    my $res = $ua->request($req);
    if ( !$res->is_success ) {
        return $app->json_error( $res->status_line );
    }

    my $res_data = MT::Util::from_json( Encode::decode( 'UTF-8', $res->content ) );

    $app->json_result( { choices => $res_data->{choices} } );
}

sub generate_basename {
    my ($app) = @_;

    my $content = substr( scalar $app->param('content'), 0, max_input_tokens() );

    my $messages = [
        {   role    => "system",
            content => <<CONTENT,
A user will provide you a title, and you suggest a "basename" in English that would be appropriate for that title.
The "basename" is the path portion of the URL, excluding the domain portion, and should be as simple as possible, with a small number of words. The maximum number of words should be no more than four.
The format is JSON, as shown below.
{
  "basename": "basename"
}
CONTENT
        },
        {   role    => "user",
            content => 'TITLE: ' . substr( scalar $app->param('content'), 0, max_input_tokens() ),
        }
    ];

    my $api_key = api_key();

    my $ua  = MT->new_ua( { timeout => 60 } );
    my $req = HTTP::Request->new(
        'POST',
        'https://api.openai.com/v1/chat/completions',
        [   'Content-Type'  => 'application/json',
            'Authorization' => "Bearer $api_key",
        ],
        Encode::encode(
            'UTF-8',
            MT::Util::to_json(
                {   model       => 'gpt-3.5-turbo',
                    messages    => $messages,
                    temperature => 0.6,
                    max_tokens  => 2046,
                }
            )
        )
    );

    my $res = $ua->request($req);
    if ( !$res->is_success ) {
        return $app->json_error( $res->status_line );
    }

    my $res_data = MT::Util::from_json( Encode::decode( 'UTF-8', $res->content ) );

    $app->json_result( { choices => $res_data->{choices} } );
}

1;
